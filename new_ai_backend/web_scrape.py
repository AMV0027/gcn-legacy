from typing import Tuple, List, Optional
import trafilatura
import re
from sentence_transformers import SentenceTransformer
import logging
import asyncio
from functools import lru_cache
from tenacity import retry, stop_after_attempt, wait_exponential
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from queue import Queue
import time
from ollama_chat import chat_ollama
import requests
import os
import tempfile
import PyPDF2
import urllib.parse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 5
MAX_CHUNKS = 8
MIN_CONTENT_LENGTH = 50
SIMILARITY_THRESHOLD = 0.2
MAX_WORKERS = 15
CHUNK_BATCH_SIZE = 100 

# Thread pool for parallel processing
thread_pool = ThreadPoolExecutor(max_workers=MAX_WORKERS)
# Thread-local storage for model
thread_local = threading.local()

# Enable more detailed logging for debugging
DEBUG_SCRAPING = True

def get_text_model():
    """Get or create thread-local instance of the text model."""
    if not hasattr(thread_local, "model"):
        try:
            thread_local.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info(f"Initialized model for thread {threading.current_thread().name}")
        except Exception as e:
            logger.error(f"Failed to initialize model in thread {threading.current_thread().name}: {e}")
            raise
    return thread_local.model

@lru_cache(maxsize=1000)
def clean_and_normalize_text(text: str) -> str:
    """Clean and normalize text for processing with caching."""
    if not text:
        return ""
    try:
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Fix spacing after punctuation
        text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.!?,;:-]', '', text)
        return text.strip()
    except Exception as e:
        logger.error(f"Error in text cleaning: {e}")
        return ""

def process_text_chunk(chunk: str, query_embedding: List[float]) -> Tuple[float, str]:
    """Process a single text chunk in a thread."""
    try:
        model = get_text_model()
        chunk_embedding = model.encode(chunk)
        similarity = float(chunk_embedding @ query_embedding)
        return similarity, chunk
    except Exception as e:
        logger.error(f"Error processing chunk: {e}")
        return 0.0, ""

def get_relevant_chunks(text: str, query: str, max_chunks: int = MAX_CHUNKS) -> List[str]:
    """Find the most relevant chunks of text based on the query using parallel processing."""
    try:
        if not text or not query:
            logger.warning("Empty text or query provided to get_relevant_chunks")
            return []

        # Split text into paragraphs and filter empty ones
        paragraphs = [p.strip() for p in text.split('\n') if len(p.strip()) > MIN_CONTENT_LENGTH]
        if not paragraphs:
            logger.warning("No paragraphs of sufficient length found in text")
            return []

        if DEBUG_SCRAPING:
            logger.info(f"Processing {len(paragraphs)} paragraphs for query: {query}")

        # Get query embedding using the main thread's model
        model = get_text_model()
        query_embedding = model.encode(query).tolist()

        # Process chunks in parallel using thread pool
        chunk_futures = []
        similarities = []
        
        # Process in batches to avoid memory issues
        for i in range(0, len(paragraphs), CHUNK_BATCH_SIZE):
            batch = paragraphs[i:i + CHUNK_BATCH_SIZE]
            
            # Submit batch processing tasks to thread pool
            futures = [
                thread_pool.submit(process_text_chunk, chunk, query_embedding)
                for chunk in batch
            ]
            chunk_futures.extend(futures)

        # Collect results as they complete
        for future in as_completed(chunk_futures):
            try:
                similarity, chunk = future.result()
                if DEBUG_SCRAPING:
                    logger.debug(f"Chunk similarity: {similarity:.4f} for chunk: {chunk[:50]}...")
                if similarity > SIMILARITY_THRESHOLD:
                    similarities.append((similarity, chunk))
            except Exception as e:
                logger.error(f"Error collecting chunk result: {e}")
                continue

        # Sort by similarity and get top chunks
        similarities.sort(reverse=True)
        top_chunks = [chunk for _, chunk in similarities[:max_chunks]]
        
        if DEBUG_SCRAPING:
            logger.info(f"Found {len(top_chunks)} relevant chunks out of {len(paragraphs)} paragraphs")
            for i, chunk in enumerate(top_chunks):
                logger.info(f"Top chunk {i+1} (similarity: {similarities[i][0]:.4f}): {chunk[:100]}...")
        
        return top_chunks

    except Exception as e:
        logger.error(f"Error in get_relevant_chunks: {e}")
        return []

def is_pdf_url(url: str) -> bool:
    """Check if the URL points to a PDF file."""
    # Check the URL extension
    parsed_url = urllib.parse.urlparse(url)
    path = parsed_url.path.lower()
    if path.endswith('.pdf'):
        return True
    
    # If no extension in URL, try making a HEAD request to check content type
    try:
        headers = requests.head(url, allow_redirects=True, timeout=5).headers
        content_type = headers.get('Content-Type', '').lower()
        return 'application/pdf' in content_type
    except Exception as e:
        logger.error(f"Error checking content type for {url}: {e}")
        return False

def download_and_process_pdf(url: str) -> Optional[str]:
    """Download and extract text from a PDF file."""
    try:
        logger.info(f"Downloading PDF from {url}")
        response = requests.get(url, timeout=30)
        
        if response.status_code != 200:
            logger.warning(f"Failed to download PDF from {url}, status code: {response.status_code}")
            return None
            
        # Create a temporary file to store the PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(response.content)
            temp_path = temp_file.name
            
        logger.info(f"PDF downloaded to temporary file: {temp_path}")
        
        # Extract text from PDF
        text = ""
        try:
            with open(temp_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
            
            logger.info(f"Successfully extracted {len(text)} characters from PDF")
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
        finally:
            # Clean up the temporary file
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.error(f"Error removing temporary PDF file: {e}")
                
        return text if text else None
    except Exception as e:
        logger.error(f"Error processing PDF from {url}: {e}")
        return None

def download_and_extract(url: str) -> Optional[str]:
    """Download and extract content from URL based on content type."""
    try:
        if DEBUG_SCRAPING:
            logger.info(f"Downloading content from {url}")
            
        # Check if URL points to a PDF
        if is_pdf_url(url):
            logger.info(f"Detected PDF URL: {url}")
            return download_and_process_pdf(url)
            
        # Process as regular webpage using trafilatura
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            logger.warning(f"Failed to download content from {url}")
            return None
        
        if DEBUG_SCRAPING:
            logger.info(f"Successfully downloaded content from {url}, now extracting...")
            
        content = trafilatura.extract(
            downloaded,
            include_links=False,
            include_images=False,
            no_fallback=False
        )
        
        if DEBUG_SCRAPING:
            if content:
                content_length = len(content)
                logger.info(f"Extracted {content_length} characters from {url}")
                logger.debug(f"Sample content from {url}: {content[:200]}...")
            else:
                logger.warning(f"No content could be extracted from {url}")
                
        return content
    except Exception as e:
        logger.error(f"Error downloading {url}: {e}")
        return None

@retry(
    stop=stop_after_attempt(MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry_error_callback=lambda _: None
)
async def scrape_webpage(url: str, query: str) -> Optional[str]:
    """Scrape webpage content using trafilatura with retries and parallel processing."""
    try:
        logger.info(f"Starting to scrape {url} for query: {query}")
        
        # Download and extract content in a thread
        content = await asyncio.get_event_loop().run_in_executor(
            thread_pool,
            download_and_extract,
            url
        )
        
        if not content:
            logger.warning(f"No content extracted from {url}")
            return None
            
        # Clean the content
        if DEBUG_SCRAPING:
            logger.info(f"Cleaning content from {url} ({len(content)} characters)")
            
        cleaned_content = clean_and_normalize_text(content)
        if not cleaned_content:
            logger.warning(f"Cleaning resulted in empty content for {url}")
            return None

        if DEBUG_SCRAPING:
            logger.info(f"Successfully cleaned content from {url} ({len(cleaned_content)} characters)")
            logger.debug(f"Sample cleaned content: {cleaned_content[:200]}...")

        # Get relevant chunks using parallel processing
        logger.info(f"Finding relevant chunks from {url} for query: {query}")
        relevant_chunks = get_relevant_chunks(cleaned_content, query)
        
        if not relevant_chunks:
            logger.warning(f"No relevant chunks found from {url}")
            return None

        if DEBUG_SCRAPING:
            logger.info(f"Found {len(relevant_chunks)} relevant chunks from {url}")
            
        return "\n\n".join(relevant_chunks)
            
    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
        return None

async def process_url(task_info: dict) -> Optional[dict]:
    """Process a single URL with its associated info."""
    try:
        logger.info(f"Processing URL: {task_info['url']}")
        content = await scrape_webpage(task_info["url"], task_info["query"])
        if content and len(content) > MIN_CONTENT_LENGTH:
            logger.info(f"Successfully retrieved content from {task_info['url']} ({len(content)} characters)")
            return {
                "url": task_info["url"],
                "title": task_info["title"],
                "snippet": task_info["snippet"],
                "content": content
            }
        else:
            logger.warning(f"Retrieved content too short or empty from {task_info['url']}")
    except Exception as e:
        logger.error(f"Error processing {task_info['url']}: {e}")
    return None

async def get_online_context(query: str, num_results: int = 5) -> str:
    """Get and process online content with parallel processing."""
    try:
        logger.info(f"Getting online context for query: {query}")
        from search_online import get_serpapi_links

        website_search_prompt = chat_ollama(
            "You are a search query optimizer. Your task is to analyze the user's query and generate the most effective search query that will yield relevant websites and articles . Focus on creating a precise, targeted search query that will help find authoritative sources and practical solutions. Return ONLY the optimized search query, nothing else.",
            query, 
            model="gemma3:4b-it-qat"
        )
        website_search_prompt = " inurl:.html"

        logger.info(f"Website search prompt: {website_search_prompt}")
        
        # Get search results
        logger.info(f"Fetching search results for: {website_search_prompt}")
        search_results = get_serpapi_links(website_search_prompt, num_results)
        
        if not search_results:
            logger.warning("No search results found")
            return ""
            
        logger.info(f"Found {len(search_results)} search results")
        
        # Create tasks for parallel processing
        tasks = []
        for i, result in enumerate(search_results):
            url = result.get("url")
            if not url:
                continue
                
            logger.info(f"Result {i+1}: {url} - {result.get('title', 'No title')}")
            tasks.append({
                "url": url,
                "title": result.get("title", "No title"),
                "snippet": result.get("snippet", ""),
                "query": query  # Add query to task info
            })

        # Process all URLs in parallel
        if tasks:
            logger.info(f"Processing {len(tasks)} URLs in parallel")
            # Create tasks for asyncio.gather
            coroutines = [process_url(task_info) for task_info in tasks]
            # Execute all tasks concurrently
            results = await asyncio.gather(*coroutines, return_exceptions=True)
            
            # Format successful results
            formatted_content = []
            successful_results = 0
            
            for i, result in enumerate(results):
                if isinstance(result, dict):  # Successful result
                    successful_results += 1
                    logger.info(f"Successfully processed URL {i+1}: {result['url']}")
                    formatted_content.extend([
                        f"Link: {result['url']}",
                        f"Title: {result['title']}",
                        f"Snippet: {result['snippet']}",
                        f"Content: {result['content']}",
                        "-" * 80
                    ])
                elif isinstance(result, Exception):  # Exception occurred
                    logger.error(f"Error processing URL {i+1}: {str(result)}")
                else:  # None result
                    logger.warning(f"No content retrieved from URL {i+1}")
                    
            logger.info(f"Successfully processed {successful_results} out of {len(results)} URLs")
                    
            if formatted_content:
                content_text = "\n".join(formatted_content)
                if DEBUG_SCRAPING:
                    logger.info(f"Retrieved online context: {len(content_text)} characters")
                return content_text
                
        logger.warning("No relevant content found from any source")
        return ""
        
    except Exception as e:
        logger.error(f"Error in get_online_context: {e}")
        return ""
