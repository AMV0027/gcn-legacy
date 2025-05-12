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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 3
MAX_CHUNKS = 3
MIN_CONTENT_LENGTH = 100
SIMILARITY_THRESHOLD = 0.3
MAX_WORKERS = 10
CHUNK_BATCH_SIZE = 50
DOWNLOAD_TIMEOUT = 10

# Thread pool for parallel processing
thread_pool = ThreadPoolExecutor(max_workers=MAX_WORKERS)
# Thread-local storage for model
thread_local = threading.local()

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
            return []

        # Split text into paragraphs and filter empty ones
        paragraphs = [p.strip() for p in text.split('\n') if len(p.strip()) > MIN_CONTENT_LENGTH]
        if not paragraphs:
            return []

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
                if similarity > SIMILARITY_THRESHOLD:
                    similarities.append((similarity, chunk))
            except Exception as e:
                logger.error(f"Error collecting chunk result: {e}")
                continue

        # Sort by similarity and get top chunks
        similarities.sort(reverse=True)
        return [chunk for _, chunk in similarities[:max_chunks]]

    except Exception as e:
        logger.error(f"Error in get_relevant_chunks: {e}")
        return []

def download_and_extract(url: str) -> Optional[str]:
    """Download and extract content from URL in a separate thread."""
    try:
        downloaded = trafilatura.fetch_url(url, timeout=DOWNLOAD_TIMEOUT)
        if not downloaded:
            return None
            
        content = trafilatura.extract(
            downloaded,
            include_links=False,
            include_images=False,
            no_fallback=False
        )
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
        cleaned_content = clean_and_normalize_text(content)
        if not cleaned_content:
            return None

        # Get relevant chunks using parallel processing
        relevant_chunks = get_relevant_chunks(cleaned_content, query)
        if not relevant_chunks:
            return None

        return "\n\n".join(relevant_chunks)
            
    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
        return None

async def process_url(task_info: dict) -> Optional[dict]:
    """Process a single URL with its associated info."""
    try:
        content = await scrape_webpage(task_info["url"], task_info["query"])
        if content and len(content) > MIN_CONTENT_LENGTH:
            return {
                "url": task_info["url"],
                "title": task_info["title"],
                "snippet": task_info["snippet"],
                "content": content
            }
    except Exception as e:
        logger.error(f"Error processing {task_info['url']}: {e}")
    return None

async def get_online_context(query: str, num_results: int = 3) -> str:
    """Get and process online content with parallel processing."""
    try:
        from search_online import get_serpapi_links
        
        # Get search results
        search_results = get_serpapi_links(query, num_results)
        if not search_results:
            logger.warning("No search results found")
            return ""
            
        # Create tasks for parallel processing
        tasks = []
        for result in search_results:
            url = result.get("url")
            if not url:
                continue
                
            tasks.append({
                "url": url,
                "title": result.get("title", "No title"),
                "snippet": result.get("snippet", ""),
                "query": query  # Add query to task info
            })

        # Process all URLs in parallel
        if tasks:
            # Create tasks for asyncio.gather
            coroutines = [process_url(task_info) for task_info in tasks]
            # Execute all tasks concurrently
            results = await asyncio.gather(*coroutines, return_exceptions=True)
            
            # Format successful results
            formatted_content = []
            for result in results:
                if isinstance(result, dict):  # Successful result
                    formatted_content.extend([
                        f"Link: {result['url']}",
                        f"Title: {result['title']}",
                        f"Snippet: {result['snippet']}",
                        f"Content: {result['content']}",
                        "-" * 80
                    ])
                    
            if formatted_content:
                return "\n".join(formatted_content)
                
        logger.warning("No relevant content found from any source")
        return ""
        
    except Exception as e:
        logger.error(f"Error in get_online_context: {e}")
        return ""
