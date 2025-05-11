from typing import Tuple, List
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from transformers import pipeline
import requests
import re
from typing import Optional

class TextProcessingError(Exception):
    """Custom exception for text processing errors"""
    pass

def clean_and_normalize_text(text: str) -> str:
    """Clean and normalize text for processing."""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Fix spacing after punctuation
    text = re.sub(r'([.!?])([A-Z])', r'\1 \2', text)
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^\w\s.!?,;:-]', '', text)
    return text.strip()

def chunk_text(text: str, max_chunk_size: int = 500) -> List[str]:
    """
    Split text into chunks that won't exceed model's token limit.
    Using conservative max_chunk_size to account for token/word ratio.
    """
    if not text:
        return []
        
    # Clean text first
    text = clean_and_normalize_text(text)
    
    # Split into sentences
    sentences = re.split('(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        # Rough estimate of tokens (words + punctuation)
        sentence_length = len(sentence.split()) + len(re.findall(r'[.!?,;:-]', sentence))
        
        # If single sentence is too long, split it
        if sentence_length > max_chunk_size:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_length = 0
            
            # Split long sentence into smaller parts
            words = sentence.split()
            temp_chunk = []
            temp_length = 0
            
            for word in words:
                word_length = len(word.split()) + len(re.findall(r'[.!?,;:-]', word))
                if temp_length + word_length > max_chunk_size:
                    if temp_chunk:
                        chunks.append(' '.join(temp_chunk) + '.')
                    temp_chunk = [word]
                    temp_length = word_length
                else:
                    temp_chunk.append(word)
                    temp_length += word_length
            
            if temp_chunk:
                chunks.append(' '.join(temp_chunk) + '.')
                
        # Normal case: add sentence to current chunk
        elif current_length + sentence_length > max_chunk_size:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_length
        else:
            current_chunk.append(sentence)
            current_length += sentence_length
    
    # Add remaining chunk
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return [chunk for chunk in chunks if len(chunk.split()) > 10]  # Only return meaningful chunks

def summarize_text(text: str, max_length: int = 500, min_length: int = 150) -> str:
    """
    Summarize text while handling various edge cases and errors professionally.
    """
    if not text:
        return ""
    
    # Don't summarize if text is already concise
    if len(text.split()) < min_length:
        return text
        
    try:
        summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
        chunks = chunk_text(text, max_chunk_size=500)  # Conservative chunk size
        summaries = []
        
        for chunk in chunks:
            chunk_words = len(chunk.split())
            if chunk_words < 50:  # Too short to summarize
                summaries.append(chunk)
                continue
                
            try:
                # Adjust lengths based on input size
                chunk_max_length = min(max_length, chunk_words - 1)
                chunk_min_length = min(min_length, chunk_max_length - 1)
                
                summary = summarizer(
                    chunk,
                    max_length=chunk_max_length,
                    min_length=chunk_min_length,
                    do_sample=False,
                    truncation=True  # Ensure we don't exceed model's limits
                )
                
                if summary and summary[0]['summary_text']:
                    summaries.append(summary[0]['summary_text'])
                else:
                    summaries.append(chunk[:chunk_max_length] + "...")
                    
            except Exception as e:
                print(f"Chunk summarization error: {e}")
                # Fallback: include truncated original text
                summaries.append(chunk[:250] + "...")
        
        # Combine summaries intelligently
        final_summary = ' '.join(summaries)
        return clean_and_normalize_text(final_summary)
        
    except Exception as e:
        print(f"Summarization pipeline error: {e}")
        # Fallback: return truncated original text
        return clean_and_normalize_text(text[:1000] + "...")

def fast_scrape_webpage(url: str) -> Optional[str]:
    """Scrape webpage content using requests with robust error handling."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for tag in soup.find_all(['script', 'style', 'header', 'footer', 'nav', 'aside', 'iframe']):
            tag.decompose()
            
        # Try different content areas
        content_areas = [
            soup.find('main'),
            soup.find('article'),
            soup.find('div', {'id': re.compile(r'content|main|article', re.I)}),
            soup.find('div', {'class': re.compile(r'content|main|article', re.I)}),
            soup.body
        ]
        
        main_content = next((area for area in content_areas if area is not None), None)
        
        if not main_content:
            return None
            
        # Extract and clean text
        text = main_content.get_text(separator=' ', strip=True)
        text = clean_and_normalize_text(text)
        
        return text if len(text) > 50 else None
        
    except requests.exceptions.RequestException as e:
        print(f"Request error for {url}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error scraping {url}: {e}")
        return None

async def scrape_webpage(url: str) -> Optional[str]:
    """Scrape webpage with fallback to Playwright for dynamic content."""
    # Try fast method first
    text = fast_scrape_webpage(url)
    if text is not None:
        return summarize_text(text)
        
    # Fallback to Playwright for dynamic sites
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = await context.new_page()
            
            try:
                await page.goto(url, timeout=15000, wait_until='networkidle')
                await page.wait_for_selector('body', timeout=5000)
                
                # Execute JavaScript to get page content
                html = await page.content()
                
            except Exception as e:
                print(f"Page load error: {e}")
                return None
            finally:
                await browser.close()

            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove unwanted elements
            for tag in soup.find_all(['script', 'style', 'header', 'footer', 'nav', 'iframe']):
                tag.decompose()
                
            # Try different content areas
            content_areas = [
                soup.find('main'),
                soup.find('article'),
                soup.find('div', {'id': re.compile(r'content|main|article', re.I)}),
                soup.find('div', {'class': re.compile(r'content|main|article', re.I)}),
                soup.body
            ]
            
            main_content = next((area for area in content_areas if area is not None), None)
            
            if not main_content:
                return None

            text = main_content.get_text(separator=' ', strip=True)
            text = clean_and_normalize_text(text)
            
            if len(text) < 50:
                return None
                
            return summarize_text(text)
            
    except Exception as e:
        print(f"Playwright error for {url}: {e}")
        return None

async def get_online_context(query: str, num_results: int = 3) -> Tuple[str, List[dict]]:
    """Get and process online content with robust error handling."""
    try:
        from search_online import get_serpapi_links
        
        search_results = get_serpapi_links(query, num_results)
        if not search_results:
            return "", []
            
        formatted_content = []
        used_links = []

        for result in search_results:
            try:
                url = result["url"]
                content = await scrape_webpage(url)
                
                if content is not None and len(content) > 100:
                    formatted_content.append(f"url: {url}\ncontent: {content}")
                    used_links.append({
                        "url": url,
                        "title": result.get("title", ""),
                        "snippet": result.get("snippet", "")
                    })
            except Exception as e:
                print(f"Error processing result {url}: {e}")
                continue
                
        if not formatted_content:
            return "", []
            
        return "\n\n".join(formatted_content), used_links
        
    except Exception as e:
        print(f"Error in get_online_context: {e}")
        return "", []
