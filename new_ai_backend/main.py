import base64
import json
import re
import time
import uuid
import traceback
from datetime import datetime
from difflib import get_close_matches
from typing import Dict, List, Optional
import numpy as np
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from io import BytesIO
from fastapi import File, UploadFile, Form
from fastapi.responses import JSONResponse
import os

from search_online import (
    search_images,
    search_videos,
    search_web_links,
)
from web_scrape import (
    get_online_context
)
from utils import extract_json

from ollama_chat import chat_ollama
from upload_pdf import (
    create_tables,
    extract_pdf_text,
    extract_pdf_info,
    text_to_vector,
    store_in_database,
    search_pdfs,
    delete_pdf,
    update_pdf_info
)

# Database Configuration
DB_CONFIG = {
    "dbname": os.getenv("POSTGRES_DB", "gcn_db"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
    "host": os.getenv("POSTGRES_HOST", "postgres"),
    "port": os.getenv("POSTGRES_PORT", "5432")
}

app = FastAPI()

# Initialize text model
text_model = SentenceTransformer('all-MiniLM-L6-v2')

serp_api_key = "a6b3928073576a6c62c095966cc44e79a062a80c176bc12677bee97183af05fb"

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize database tables
create_tables()

class QueryRequest(BaseModel):
    query: str
    org_query: str
    chat_id: Optional[str] = None

def get_db_connection():
    """Create and return a database connection."""
    return psycopg2.connect(**DB_CONFIG)

def vector_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def get_search_query(search_query: str) -> str:
    """
    Generate a refined search query using Ollama.
    """
    system_prompt = (
        "Given the user's query, generate the most suitable search phrase. The search phrase must be short and must contain the title "
        "for Google Search to find relevant reference links, images or videos. "
        "Return ONLY the search phrase without any additional text or explanations."
    )
    try:
        response = chat_ollama(system_prompt, search_query, model="gemma3:1b")
        return response.strip()
    except Exception as e:
        print(f"Error generating search query: {e}")
        return search_query  # Fallback to original query

def search_relevant_texts(query_vector: List[float], pdf_names: List[str], threshold: float = 0.6) -> List[dict]:
    """Search for relevant text chunks in the specified PDFs with improved relevance."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        relevant_texts = []
        for pdf_name in pdf_names:
            cur.execute("""
                SELECT text_vectors, pdf_info 
                FROM pdfdata 
                WHERE pdf_name = %s
            """, (pdf_name,))
            
            row = cur.fetchone()
            if row and row[0]:
                vectors = row[0]
                pdf_info = row[1] if row[1] else {}
                
                if isinstance(vectors, str):
                    vectors = json.loads(vectors)
                elif isinstance(vectors, list):
                    vectors = vectors
                else:
                    continue
                    
                # Group text chunks by page for better context
                page_chunks = {}
                for vec_info in vectors:
                    page_num = vec_info['page_number']
                    if page_num not in page_chunks:
                        page_chunks[page_num] = []
                    page_chunks[page_num].append({
                        'text': vec_info['text'],
                        'similarity': vector_similarity(query_vector, vec_info['vector'])
                    })
                
                # Process each page's chunks
                for page_num, chunks in page_chunks.items():
                    # Sort chunks by similarity
                    chunks.sort(key=lambda x: x['similarity'], reverse=True)
                    
                    # Get the best matching chunk for this page
                    best_chunk = chunks[0]
                    if best_chunk['similarity'] >= threshold:
                        # Get surrounding context
                        context = " ".join([chunk['text'] for chunk in chunks[:3]])
                        
                        relevant_texts.append({
                            'pdf_name': pdf_name,
                            'text': context,
                            'page_number': page_num,
                            'similarity': best_chunk['similarity'],
                            'pdf_info': pdf_info
                        })
        
        # Sort by similarity and return top chunks
        relevant_texts.sort(key=lambda x: x['similarity'], reverse=True)
        return relevant_texts[:5]  # Return top 5 most relevant chunks
        
    except Exception as e:
        print(f"Error searching relevant texts: {e}")
        traceback.print_exc()
        return []
    finally:
        cur.close()
        conn.close()

def organize_pdf_references(relevant_texts: List[dict]) -> List[dict]:
    """Organize PDF references with improved context and relevance."""
    pdf_refs = {}
    
    for text in relevant_texts:
        pdf_name = text['pdf_name']
        if pdf_name not in pdf_refs:
            pdf_refs[pdf_name] = {
                "name": pdf_name,
                "page_number": [],
                "relevance_score": 0,
                "context": [],
                "pdf_info": text.get('pdf_info', {})
            }
        
        # Add page number if not already present
        if text['page_number'] not in pdf_refs[pdf_name]["page_number"]:
            pdf_refs[pdf_name]["page_number"].append(text['page_number'])
            pdf_refs[pdf_name]["context"].append({
                "page": text['page_number'],
                "text": text['text'][:200] + "..." if len(text['text']) > 200 else text['text']
            })
        
        # Update relevance score
        pdf_refs[pdf_name]["relevance_score"] = max(
            pdf_refs[pdf_name]["relevance_score"],
            text['similarity']
        )
    
    # Convert to list and sort by relevance
    refs_list = list(pdf_refs.values())
    refs_list.sort(key=lambda x: x['relevance_score'], reverse=True)
    
    return refs_list

def generate_chat_summary(query: str, answer: str) -> dict:
    """Generate a summary and key points from the chat interaction."""
    try:
        system_prompt = """
        Analyze the following chat interaction and create a JSON summary with this exact format:
        {
            "summary": "brief 2-3 sentence summary here",
            "key_points": ["point1", "point2", "point3"]
        }
        
        Guidelines:
        - Focus on regulatory requirements and compliance details
        - Highlight specific standards or regulations mentioned
        - Include any numerical requirements or deadlines
        - Note any critical compliance warnings or requirements
        
        Return ONLY the JSON object, no additional text.
        """
        
        chat_content = f"User Query: {query}\nAnswer: {answer}"
        content = chat_ollama(system_prompt, chat_content, model="gemma3:1b")
        return extract_json(content)
        
    except Exception as e:
        print(f"Error generating summary: {e}")
        return {
            "summary": "Summary generation failed",
            "key_points": ["No key points available"]
        }

def get_chat_context(chat_id: str, limit: int = 3) -> str:
    """Retrieve recent chat context for the given chat ID."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get the most recent chat memory entries
        cur.execute("""
            SELECT summary, key_points, created_at 
            FROM chat_memory 
            WHERE chat_id = %s 
            ORDER BY created_at DESC 
            LIMIT %s
        """, (chat_id, limit))
        
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        if not results:
            return ""
        
        # Format the context with timestamps
        context = "Previous conversation context:\n"
        for summary, key_points, created_at in results:
            # Assuming created_at is a datetime object
            context += f"\n[{created_at.strftime('%Y-%m-%d %H:%M')}]\n"
            context += f"Summary: {summary}\n"
            if key_points:
                context += "Key points:\n"
                for point in key_points:
                    context += f"• {point}\n"
                    
        return context
    except Exception as e:
        print(f"Error getting chat context: {e}")
        return ""

def generate_final_answer(query: str, context: str, chat_id: Optional[str] = None) -> str:
    """Generate final answer using available context."""
    try:
        # Get chat history context if available
        chat_context = get_chat_context(chat_id) if chat_id else ""
        
        system_prompt = f"""
        You are a regulatory compliance assistant. Use the following information to answer the query:
        
        Available Context:
        {context}
        
        Chat History:
        {chat_context}
        
        Guidelines:
        1. Be precise and factual
        2. Cite sources using [Source] or [Page X] notation
        3. If using online sources, include relevant URLs
        4. If information is incomplete, acknowledge limitations
        5. Maintain professional tone
        6. STRICTLY DONT MENTION ANY DISCLAIMER.
        """
        
        # Use chat_ollama for final answer generation
        answer = chat_ollama(system_prompt, query, model="gemma3:1b")
        
        if not context.startswith("Online Sources"):
            return answer
        return wrap_final_answer(answer, query)
        
    except Exception as e:
        print(f"Error generating final answer: {e}")
        return "I apologize, but I'm having trouble processing your request at the moment."

def get_related_queries(query: str) -> List[str]:
    """Generate related queries based on the input query."""
    system_prompt = """
    Generate 5 related compliance questions that users might want to ask next.
    Return them in a JSON format like this:
    {
        "relevant_queries": [
            "What are the specific documentation requirements?",
            "How often should safety audits be conducted?",
            "What are the penalties for non-compliance?",
            "Are there industry-specific guidelines?",
            "Who is responsible for enforcement?"
        ]
    }
    """

    try:
        response = chat_ollama(system_prompt, query, model="gemma3:1b")
        extracted_json = extract_json(response)
        return extracted_json.get("relevant_queries", [])
    except Exception as e:
        print(f"Error generating related queries: {e}")
        return []

def generate_conversational_answer(query: str, chat_context: str) -> str:
    """Generate an answer based on chat history and general knowledge."""
    system_prompt = """
    You are a knowledgeable compliance assistant. Generate a response using the provided information.
    If asked about previous conversations:
    1. Summarize the key points from the chat history
    2. Highlight important compliance topics discussed
    3. Note any regulatory requirements or standards mentioned
    4. Connect related topics across conversations
    5. Suggest relevant follow-up areas
    
    If no relevant information is found:
    1. Acknowledge the lack of specific history
    2. Provide general compliance guidance
    3. Suggest relevant compliance topics to explore
    
    Always maintain a professional but conversational tone.
    """
    try:
        response = chat_ollama(system_prompt, f"Chat History:\n{chat_context}\n\nUser Query: {query}")
        return response['message']['content']
    except Exception as e:
        return "I apologize, but I'm having trouble processing the chat history. Would you like to discuss a specific compliance topic instead?"

def generate_chat_name(query: str) -> str:
    """Generate a meaningful chat name from the user's query."""
    system_prompt = """
    Create a concise, descriptive title (3-6 words) for this chat based on the user's query.
    The title should:
    1. Capture the main topic and intent
    2. Be specific and informative
    3. Use proper capitalization
    4. Avoid generic terms like 'Chat about' or 'Discussion of'
    5. Not include dates or timestamps
    6. Be suitable for a professional context
    
    Examples:
    Query: "What are the safety requirements for chemical storage?"
    Response: "Chemical Storage Safety Guidelines"
    
    Query: "How to implement ISO 9001 in manufacturing?"
    Response: "ISO 9001 Manufacturing Implementation"
    
    Query: "What are the latest FDA regulations for medical devices?"
    Response: "FDA Medical Device Regulations Update"
    
    Return ONLY the title, nothing else.
    """
    try:
        response = chat_ollama(system_prompt, query, model="gemma3:1b")
        # Clean and format the response
        chat_name = response.strip()
        # Remove any quotes and extra whitespace
        chat_name = chat_name.strip('"\'')
        # Ensure proper capitalization
        chat_name = ' '.join(word.capitalize() for word in chat_name.split())
        return chat_name
    except Exception as e:
        print(f"Error generating chat name: {e}")
        # Create a fallback name using the first few words of the query
        words = query.split()[:4]
        return ' '.join(word.capitalize() for word in words)

def get_all_pdf_names() -> List[str]:
    """Retrieve all PDF names from the database."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT pdf_name FROM pdfdata")
    pdf_names = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return pdf_names

def get_best_matches(extracted_names: List[str], available_names: List[str]) -> List[str]:
    """Find the closest matching PDF names from available names."""
    best_matches = []
    for name in extracted_names:
        matches = get_close_matches(name, available_names, n=1, cutoff=0.6)
        if matches:
            best_matches.append(matches[0])
    return best_matches

def identify_relevant_pdfs(query: str) -> List[str]:
    """Use text similarity to identify relevant PDFs."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get all PDF names and their content vectors
        cur.execute("SELECT DISTINCT pdf_name, text_vectors FROM pdfdata")
        rows = cur.fetchall()
        
        if not rows:
            return []
            
        # Encode query
        query_vector = text_model.encode(query).tolist()
        
        relevant_pdfs = []
        for pdf_name, text_vectors in rows:
            if text_vectors:  # Check if text_vectors exists
                vectors = json.loads(text_vectors) if isinstance(text_vectors, str) else text_vectors
                # Calculate max similarity for this PDF
                max_similarity = max(
                    vector_similarity(query_vector, vec_info['vector'])
                    for vec_info in vectors
                )
                if max_similarity > 0.4:  # Adjust threshold as needed
                    relevant_pdfs.append((pdf_name, max_similarity))
        
        # Sort by relevance and return top 5
        relevant_pdfs.sort(key=lambda x: x[1], reverse=True)
        return [pdf[0] for pdf in relevant_pdfs[:5]]
        
    except Exception as e:
        print(f"Error identifying relevant PDFs: {e}")
        return []
    finally:
        cur.close()
        conn.close()

def wrap_final_answer(answer: str, query: str) -> str:
    """Add an additional layer of processing to improve answer quality using Ollama."""
    system_prompt = """
    You are an expert compliance assistant. Review and enhance the following answer:
    1. Ensure clarity and accuracy
    2. Add relevant context if needed
    3. Maintain professional tone
    4. Keep the original meaning intact
    5. Add any important regulatory references if applicable
    6. Include proper citations for online references
    7. Format URLs clearly when present
    """
    
    try:
        return chat_ollama(
            system_prompt,
            f"Original Query: {query}\n\nDraft Answer: {answer}",
            model="gemma3:1b"
        )
    except Exception as e:
        print(f"Error wrapping final answer: {e}")
        return answer  # Return original answer if enhancement fails

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file."""
    try:
        # Read file content
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty file received")
            
        pdf_name = file.filename.replace(".pdf", "")
        
        # Process text
        text_data = extract_pdf_text(pdf_bytes)
        if not text_data:
            raise HTTPException(status_code=400, detail="No text extracted - possible corrupted PDF")
        
        # Generate info
        pdf_info = extract_pdf_info(text_data)
        
        # Generate vectors
        vectors = text_to_vector(text_data)
        
        # Store in database
        success = store_in_database(pdf_name, pdf_bytes, vectors, pdf_info)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store PDF in database")
        
        return {"message": f"Successfully processed: {pdf_name}"}
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search-pdfs")
async def search_pdf_documents(search_query: str = None):
    """Search PDF documents."""
    try:
        results = search_pdfs(search_query)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/delete-pdf/{pdf_name}")
async def delete_pdf_document(pdf_name: str):
    """Delete a PDF document."""
    try:
        success = delete_pdf(pdf_name)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete PDF")
        return {"message": f"Successfully deleted: {pdf_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/update-pdf-info/{pdf_name}")
async def update_pdf_document_info(pdf_name: str, new_info: str):
    """Update PDF document information."""
    try:
        success = update_pdf_info(pdf_name, new_info)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update PDF info")
        return {"message": f"Successfully updated info for: {pdf_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
async def process_query(request: QueryRequest) -> Dict:
    try:
        query = request.query
        org_query = request.org_query
        print(f"Processing query: {query}")
        
        # Generate chat name from the original query
        chat_name = generate_chat_name(org_query)
        print(f"Generated chat name: {chat_name}")
        
        # Step 1: Find relevant PDFs
        relevant_pdfs = identify_relevant_pdfs(query)
        print(f"Found {len(relevant_pdfs)} relevant PDFs")
        
        # Step 2: Extract relevant content and references
        pdf_context = ""
        relevant_texts = []
        
        if relevant_pdfs:
            query_vector = text_model.encode(query).tolist()
            relevant_texts = search_relevant_texts(query_vector, relevant_pdfs)
            
            if relevant_texts:
                # Prepare PDF context with improved formatting
                pdf_context = "\n\n".join([
                    f"[{text['pdf_name']} Page {text['page_number']}] {text['text']}"
                    for text in relevant_texts
                ])
                
                # Organize PDF references with improved context
                pdf_refs = organize_pdf_references(relevant_texts)
            else:
                pdf_refs = []
        else:
            pdf_refs = []
        
        # Step 3: Get online context if needed
        context = pdf_context
        online_context = await get_online_context(query)
        context = f"{context}\n\nOnline Sources:\n\n{online_context}"
        
        # Step 4: Generate answer
        answer = generate_final_answer(query, context, request.chat_id)
        
        # Step 5: Get additional content
        online_images = search_images(query)
        online_videos = search_videos(query)
        online_links = search_web_links(query)
        related_queries = get_related_queries(query)
        
        return {
            "query": org_query,
            "answer": answer,
            "chat_name": chat_name,
            "pdf_references": pdf_refs,
            "online_images": online_images,
            "online_videos": online_videos,
            "online_links": online_links,
            "related_queries": related_queries
        }

    except Exception as e:
        print(f"Error in process_query: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def generate_product_queries(product_title: str, product_info: str) -> List[str]:
    """Generate related queries for a product."""
    system_prompt = """
    Generate 3 specific and relevant compliance-related questions for this product.
    The questions should:
    1. Focus on regulatory requirements and compliance
    2. Be specific to the product's domain
    3. Cover different aspects (safety, documentation, implementation)
    4. Be clear and actionable
    5. Be suitable for a professional context

    Return ONLY a JSON array of 3 questions, nothing else.
    Example format:
    [
        "What are the specific safety requirements for implementing this product?",
        "How to ensure compliance with industry standards when using this product?",
        "What documentation is required for product certification?"
    ]
    """
    try:
        context = f"Product Title: {product_title}\nProduct Info: {product_info}"
        response = chat_ollama(system_prompt, context, model="gemma3:1b")
        queries = json.loads(response)
        return queries[:3]  # Ensure we only return 3 queries
    except Exception as e:
        print(f"Error generating product queries: {e}")
        return []

@app.post("/api/generate-product-queries")
async def generate_queries(request: dict):
    """Generate and store product-related queries."""
    try:
        product_title = request.get("title")
        product_info = request.get("info")
        
        if not product_title or not product_info:
            raise HTTPException(status_code=400, detail="Product title and info are required")
            
        queries = generate_product_queries(product_title, product_info)
        
        # Store in database
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Create table if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS product_related_queries (
                id SERIAL PRIMARY KEY,
                product_title TEXT NOT NULL,
                query TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert queries
        for query in queries:
            cur.execute(
                "INSERT INTO product_related_queries (product_title, query) VALUES (%s, %s)",
                (product_title, query)
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"queries": queries}
    except Exception as e:
        print(f"Error in generate_queries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/random-product-queries")
async def get_random_queries():
    """Get 3 random product-related queries."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT query FROM product_related_queries 
            ORDER BY RANDOM() 
            LIMIT 3
        """)
        
        queries = [row[0] for row in cur.fetchall()]
        
        cur.close()
        conn.close()
        
        return {"queries": queries}
    except Exception as e:
        print(f"Error getting random queries: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
