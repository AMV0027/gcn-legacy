import json
import re
from io import BytesIO
from typing import Dict, List, Optional
import psycopg2
import pdfplumber
from sentence_transformers import SentenceTransformer

# Database Configuration
DB_CONFIG = {
    "dbname": "gcn-legacy",
    "user": "postgres",
    "password": "12345",
    "host": "172.19.171.58",
    "port": "5432"
}

# Initialize text model
text_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_db_connection():
    """Create and return a database connection."""
    return psycopg2.connect(**DB_CONFIG)

def create_tables():
    """Create database tables if they don't exist"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Create main table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS pdfdata (
                pdf_name TEXT PRIMARY KEY,
                pdf_file BYTEA,
                text_vectors JSONB,
                pdf_info TEXT
            )
        """)
        
        conn.commit()
    except Exception as e:
        print(f"Error creating tables: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extracts text from PDF with page numbers for each word."""
    text_with_pages = []
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text() or ""
                # Add page number for each word to track cross-page chunks
                words = page_text.split()
                for word in words:
                    text_with_pages.append((word, str(page_num)))
    except Exception as e:
        print(f"Error extracting text: {e}")
    return text_with_pages

def extract_pdf_info(text_with_pages: List[tuple]) -> str:
    """Extract first 300 words as PDF info from the word-page tuple list."""
    if not text_with_pages:
        return ""
    
    # Extract just the words from the tuples, ignoring page numbers
    words = [word for word, _ in text_with_pages[:300]]
    return ' '.join(words)

def text_to_vector(text_with_pages: List[tuple]) -> List[Dict]:
    """Converts text to vectors using overlapping chunks of max 20 words."""
    vectors = []
    chunk_size = 20
    overlap = 5  # Number of words to overlap between chunks
    
    if not text_with_pages:
        return vectors
    
    # Process text in overlapping chunks
    for i in range(0, len(text_with_pages), chunk_size - overlap):
        try:
            # Get chunk of words and their page numbers
            chunk = text_with_pages[i:i + chunk_size]
            if not chunk:
                continue
                
            # Separate words and page numbers
            words, pages = zip(*chunk)
            text_chunk = ' '.join(words)
            
            # Determine page range for this chunk
            unique_pages = sorted(set(pages))
            if len(unique_pages) == 1:
                page_str = unique_pages[0]
            else:
                page_str = f"{unique_pages[0]}-{unique_pages[-1]}"
            
            if text_chunk.strip():
                vector = text_model.encode(text_chunk, convert_to_tensor=False).tolist()
                vectors.append({
                    "vector": vector,
                    "text": text_chunk,
                    "page_number": page_str
                })
        except Exception as e:
            print(f"Error processing text chunk: {e}")
            continue
    
    return vectors

def store_in_database(pdf_name: str, pdf_bytes: bytes, vectors: List[Dict], pdf_info: str) -> bool:
    """Stores data in PostgreSQL database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Insert into pdfdata
        cur.execute("""
            INSERT INTO pdfdata (pdf_name, pdf_file, text_vectors, pdf_info)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (pdf_name) DO UPDATE
            SET pdf_file = EXCLUDED.pdf_file,
                text_vectors = EXCLUDED.text_vectors,
                pdf_info = EXCLUDED.pdf_info
        """, (pdf_name, psycopg2.Binary(pdf_bytes), json.dumps(vectors), pdf_info))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Database error: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

def search_pdfs(search_query: Optional[str] = None) -> List[Dict]:
    """Search PDFs in database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if search_query:
            cur.execute("""
                SELECT pdf_name, pdf_info FROM pdfdata 
                WHERE pdf_name ILIKE %s OR pdf_info ILIKE %s
            """, (f'%{search_query}%', f'%{search_query}%'))
        else:
            cur.execute("SELECT pdf_name, pdf_info FROM pdfdata")
            
        results = cur.fetchall()
        return [{"name": row[0], "info": row[1]} for row in results]
    finally:
        cur.close()
        conn.close()

def delete_pdf(pdf_name: str) -> bool:
    """Delete PDF from database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("DELETE FROM pdfdata WHERE pdf_name = %s", (pdf_name,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Delete error: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

def update_pdf_info(pdf_name: str, new_info: str) -> bool:
    """Update PDF information"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE pdfdata 
            SET pdf_info = %s 
            WHERE pdf_name = %s
        """, (new_info, pdf_name))
        conn.commit()
        return True
    except Exception as e:
        print(f"Update error: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
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
            pdf_refs[pdf_name]["page_numbers"].add(int(page_str))
        
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
