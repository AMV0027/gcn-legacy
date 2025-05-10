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
    "dbname": os.getenv("POSTGRES_DB", "gcn-legacy"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "12345"),
    "host": os.getenv("POSTGRES_HOST", "172.19.171.58"),
    "port": os.getenv("POSTGRES_PORT", "5432")
}

app = FastAPI()

# Initialize text model
text_model = SentenceTransformer('all-MiniLM-L6-v2')

serp_api_key = "75095060be745b84a9352567e0ca4d096b4c24763960161540f43ea4e45d299b<stopped for testing>"

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
        response = chat_ollama(system_prompt, search_query, model="gemma3:4b")
        return response.strip()
    except Exception as e:
        print(f"Error generating search query: {e}")
        return search_query  # Fallback to original query

def search_relevant_texts(query_vector: List[float], pdf_names: List[str], threshold: float = 0.4) -> List[dict]:
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
                
                # Calculate both max and average similarity for chunks
                chunk_matches = []
                for vec_info in vectors:
                    similarity = vector_similarity(query_vector, vec_info['vector'])
                    if similarity >= threshold:
                        chunk_matches.append({
                            'pdf_name': pdf_name,
                            'text': vec_info['text'],
                            'page_number': vec_info['page_number'],
                            'similarity': similarity,
                            'pdf_info': pdf_info
                        })
                
                # Sort chunks by similarity and take top 3 per PDF
                if chunk_matches:
                    chunk_matches.sort(key=lambda x: x['similarity'], reverse=True)
                    relevant_texts.extend(chunk_matches[:3])
        
        # Sort all matches by similarity and return top results
        relevant_texts.sort(key=lambda x: x['similarity'], reverse=True)
        
        if not relevant_texts:
            print(f"\nNo relevant text chunks found above threshold {threshold}")
        else:
            print(f"\nFound {len(relevant_texts)} relevant text chunks")
            
        return relevant_texts[:5]
        
    except Exception as e:
        print(f"Error searching relevant texts: {e}")
        traceback.print_exc()
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def organize_pdf_references(relevant_texts: List[dict]) -> List[dict]:
    """Organize PDF references with improved context and handle hyphenated page numbers."""
    pdf_refs = {}
    
    for text in relevant_texts:
        pdf_name = text['pdf_name']
        if pdf_name not in pdf_refs:
            pdf_refs[pdf_name] = {
                "name": pdf_name,
                "page_numbers": set(),  # Use set to handle duplicates
                "relevance_score": 0,
                "context": [],
                "pdf_info": text.get('pdf_info', {})
            }
        
        # Handle page numbers with hyphens
        page_str = text['page_number']
        if '-' in page_str:
            start, end = map(int, page_str.split('-'))
            pdf_refs[pdf_name]["page_numbers"].update(range(start, end + 1))
        else:
            try:
                page_num = int(page_str)
                pdf_refs[pdf_name]["page_numbers"].add(page_num)
            except ValueError:
                print(f"Warning: Invalid page number format: {page_str}")
                continue
        
        # Update context and relevance
        pdf_refs[pdf_name]["context"].append({
            "page": page_str,
            "text": text['text'][:200] + "..." if len(text['text']) > 200 else text['text']
        })
        
        pdf_refs[pdf_name]["relevance_score"] = max(
            pdf_refs[pdf_name]["relevance_score"],
            text['similarity']
        )
    
    # Convert page_numbers set to sorted list for output
    refs_list = []
    for ref in pdf_refs.values():
        ref["page_numbers"] = sorted(list(ref["page_numbers"]))
        refs_list.append(ref)
    
    # Sort by relevance
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
        content = chat_ollama(system_prompt, chat_content, model="gemma3:4b")
        return extract_json(content)
        
    except Exception as e:
        print(f"Error generating summary: {e}")
        return {
            "summary": "Summary generation failed",
            "key_points": ["No key points available"]
        }

def get_chat_context(chat_id: str, limit: int = 0) -> str:
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
        You are an expert regulatory compliance assistant specializing in analyzing and explaining compliance requirements, standards, and risks in clear, detailed terms. Use the following inputs to provide comprehensive, well-structured, and informative answers. Format all responses using Markdown.

        Inputs:
        Available Context:
        {context}

        Chat History:
        {chat_context}

        Response Guidelines:
        Use proper Markdown formatting for clarity and organization:

        Use headings (#, ##, ###)

        Use bullet points, numbered lists, blockquotes, and tables

        Highlight key terms with **bold**, _italic_, or inline code

        Include code blocks for any technical content (e.g., JSON, schemas)

        Incorporate visuals (e.g., diagrams, tables, or linked images) if they help clarify complex concepts. Use Markdown syntax to embed or link them.

        Begin with a concise summary, followed by in-depth explanation, context, examples, and analysis.

        Cite all sources using title notation, like this: ^Regulation Title^, ^ISO 27001:2022^, or ^https://example.com/document.pdf^

        Be accurate, specific, and context-driven — explain what the regulation says, why it matters, and how it applies.

        Acknowledge gaps or limits if the provided context is incomplete. If relevant, suggest where missing information might be obtained.

        Maintain a formal, professional tone suitable for compliance, legal, or executive audiences.

        STRICTLY DO NOT include any disclaimers or general legal warnings unless explicitly included in the context.
        """
        
        # Use chat_ollama for final answer generation
        answer = chat_ollama(system_prompt, query, model="gemma3:4b")
        return answer
        
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
        response = chat_ollama(system_prompt, query, model="gemma3:4b")
        extracted_json = extract_json(response)
        return extracted_json.get("relevant_queries", [])
    except Exception as e:
        print(f"Error generating related queries: {e}")
        return []

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
        response = chat_ollama(system_prompt, query, model="gemma3:4b")
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
    """Use text similarity and exact matches to identify relevant PDFs."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get all PDF names and their content vectors
        cur.execute("SELECT DISTINCT pdf_name, text_vectors FROM pdfdata")
        rows = cur.fetchall()
        
        if not rows:
            return []
        
        # First, try to find exact matches or close matches in PDF names (case insensitive)
        pdf_names = [row[0] for row in rows]
        query_lower = query.lower()
        exact_matches = [name for name in pdf_names if query_lower in name.lower()]
        
        # Store all PDF relevance scores for feedback
        all_pdf_scores = []
        
        # If no exact matches, try semantic search
        query_vector = text_model.encode(query).tolist()
        
        for pdf_name, text_vectors in rows:
            if not text_vectors:
                continue
                
            vectors = json.loads(text_vectors) if isinstance(text_vectors, str) else text_vectors
            
            # Calculate similarities for each chunk
            chunk_similarities = []
            chunk_texts = []
            for vec_info in vectors:
                similarity = vector_similarity(query_vector, vec_info['vector'])
                chunk_similarities.append(similarity)
                chunk_texts.append(vec_info['text'])
            
            # Get both max and average similarity for better relevance
            if chunk_similarities:
                max_similarity = max(chunk_similarities)
                avg_similarity = sum(chunk_similarities) / len(chunk_similarities)
                # Combined score with more weight to max similarity
                combined_score = (max_similarity * 0.7) + (avg_similarity * 0.3)
                
                # Store score and best matching chunk for feedback
                best_chunk_idx = chunk_similarities.index(max_similarity)
                all_pdf_scores.append({
                    "name": pdf_name,
                    "score": combined_score,
                    "max_similarity": max_similarity,
                    "avg_similarity": avg_similarity,
                    "best_matching_text": chunk_texts[best_chunk_idx][:200] + "..." if len(chunk_texts[best_chunk_idx]) > 200 else chunk_texts[best_chunk_idx]
                })
        
        # Sort all PDFs by relevance
        all_pdf_scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Get relevant PDFs (score > 0.4)
        relevant_pdfs = [pdf["name"] for pdf in all_pdf_scores if pdf["score"] >= 0.4]
        
        # If we have exact matches, prioritize them
        if exact_matches:
            # Combine exact matches with high-scoring semantic matches
            relevant_pdfs = list(set(exact_matches + relevant_pdfs))
        
        # Print feedback about PDF relevance
        print("\nPDF Relevance Scores:")
        for pdf in all_pdf_scores:
            status = "SELECTED" if pdf["name"] in relevant_pdfs else "NOT SELECTED"
            print(f"\nPDF: {pdf['name']}")
            print(f"Status: {status}")
            print(f"Combined Score: {pdf['score']:.3f}")
            print(f"Max Similarity: {pdf['max_similarity']:.3f}")
            print(f"Avg Similarity: {pdf['avg_similarity']:.3f}")
            print(f"Best matching text: {pdf['best_matching_text']}")
        
        return relevant_pdfs[:5]  # Return top 5 most relevant PDFs
        
    except Exception as e:
        print(f"Error identifying relevant PDFs: {e}")
        traceback.print_exc()
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

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
        pdf_refs = []
        
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
                
                # Ensure each reference has page_numbers field
                for ref in pdf_refs:
                    if "page_numbers" not in ref:
                        ref["page_numbers"] = sorted(list({
                            int(text["page_number"]) 
                            for text in relevant_texts 
                            if text["pdf_name"] == ref["name"] and text["page_number"].isdigit()
                        }))
        
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
        response = chat_ollama(system_prompt, context, model="gemma3:4b")
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
