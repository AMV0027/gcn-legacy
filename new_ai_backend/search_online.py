try:
    from serpapi import GoogleSearch
except ImportError:
    from serpapi.google_search_results import GoogleSearch
import re
from typing import List
import os
from ollama_chat import chat_ollama
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get SerpAPI key from environment variable or use fallback
SERPAPI_KEY = os.getenv('SERPAPI_KEY', '7b866668a4ef6ff88aa85124d24f84e4192ce3c00b235ce94a40378ac20f7e16')

# Ensure we have a SERPAPI key
if not SERPAPI_KEY:
    raise ValueError("SERPAPI_KEY is not available")

def get_search_query(search_query: str) -> str:
    """
    Generate a refined search query using OpenRouter.
    """
    system_prompt = """
    Generate a specific and informative search query for finding relevant images. Follow these guidelines:

    1. Focus on technical and professional aspects:
       - Include specific industry terms
       - Add relevant standards or regulations
       - Specify document types (charts, diagrams, infographics)
       - Include compliance-related terms

    2. Add context qualifiers:
       - "official" or "regulatory" for compliance documents
       - "technical" or "professional" for industry standards
       - "infographic" or "diagram" for visual explanations
       - "certification" or "compliance" for regulatory images

    3. Include specific elements:
       - Safety equipment or procedures
       - Compliance documentation
       - Regulatory symbols or logos
       - Technical specifications
       - Industry standards

    4. Avoid generic terms and focus on:
       - Specific compliance requirements
       - Technical documentation
       - Professional standards
       - Regulatory guidelines

    Examples:
    Query: "safety requirements for chemical storage"
    Response: "chemical storage safety compliance infographic OSHA regulations technical diagram"

    Query: "ISO 9001 implementation"
    Response: "ISO 9001 quality management system implementation flowchart certification process diagram"

    Query: "FDA medical device regulations"
    Response: "FDA medical device compliance requirements technical documentation regulatory guidelines infographic"

    Return ONLY the search phrase without any additional text or explanations.
    """

    try:
        response = chat_ollama(
            system_prompt, 
            f"Generate a specific image search query for: {search_query}", 
            model="gemma3:4b-it-qat"
        )
        return response.strip()
    except Exception as e:
        print(f"Error generating search query: {e}")
        # Enhanced fallback query
        fallback_terms = [
            "compliance",
            "regulatory",
            "technical",
            "professional",
            "infographic"
        ]
        return f"{search_query} {' '.join(fallback_terms[:2])}"

def search_images(search_query: str, max_images: int = 5) -> list:
    """
    Search for images using SerpAPI.
    Returns a list of image URLs.
    """
    try:
        # Use the search query directly without additional processing
        params = {
            "engine": "google_images",
            "q": search_query,
            "api_key": SERPAPI_KEY,
            "ijn": 0  # First page of results
        }

        search = GoogleSearch(params)
        results = search.get_dict()

        if "error" in results:
            print(f"SerpAPI error: {results['error']}")
            return []

        # Extract image URLs from results
        images = []
        for img in results.get("images_results", [])[:max_images]:
            if img.get("original"):
                images.append(img["original"])
                
        return images

    except Exception as e:
        print(f"Error searching for images: {str(e)}")
        return []
    
def search_videos(search_query: str, max_videos: int = 5) -> list:
    """
    Search for YouTube videos using SerpAPI.
    Returns a list of YouTube video IDs.
    """
    try:
        query = get_search_query(search_query)

        params = {
            "engine": "youtube",
            "search_query": query,
            "api_key": SERPAPI_KEY
        }

        search = GoogleSearch(params)
        results = search.get_dict()

        if "error" in results:
            print(f"SerpAPI error: {results['error']}")
            return []

        video_links = [vid.get("link") for vid in results.get("video_results", [])[:max_videos] if "link" in vid]

        # Extract video IDs from URLs
        video_ids = [re.search(r"v=([\w-]+)", link).group(1) for link in video_links if re.search(r"v=([\w-]+)", link)]

        return video_ids

    except Exception as e:
        print(f"Error in search_videos function for query '{search_query}': {str(e)}")
        return []

def search_web_links(search_query: str, max_links: int = 5) -> list:
    """
    Search for web links using SerpAPI.
    Returns a list of extracted URLs.
    """
    try:
        params = {
            "engine": "google",
            "q": search_query,
            "api_key": SERPAPI_KEY
        }

        search = GoogleSearch(params)
        results = search.get_dict()

        if "error" in results:
            print(f"SerpAPI error: {results['error']}")
            return []

        # Extract links from search results
        web_links = [result.get("link") for result in results.get("organic_results", [])[:max_links] if "link" in result]

        return web_links

    except Exception as e:
        print(f"Error in search_web_links function for query '{search_query}': {str(e)}")
        return []

def get_serpapi_links(query: str, num_results: int = 5) -> list:
    """Get relevant links using SerpAPI."""
    try:
        params = {
            "engine": "google",
            "q": f"{query} compliance regulations guidelines",
            "num": num_results,
            "api_key": SERPAPI_KEY
        }
        
        search = GoogleSearch(params)
        results = search.get_dict()
        
        if "error" in results:
            print(f"SerpAPI error: {results['error']}")
            return []
            
        # Extract organic search results
        links = []
        for result in results.get("organic_results", [])[:num_results]:
            if "link" in result:
                links.append({
                    "url": result["link"],
                    "title": result.get("title", ""),
                    "snippet": result.get("snippet", "")
                })
        
        return links
    except Exception as e:
        print(f"Error in SerpAPI search: {e}")
        return []