import json
import re
import tiktoken

def extract_json(text: str) -> dict:
    """Extract JSON from text, with better error handling."""
    try:
        # First try direct JSON parsing
        return json.loads(text)
    except json.JSONDecodeError:
        try:
            # Try to find JSON between curly braces
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # If no JSON found, create a basic structure
            return {
                "summary": text,
                "key_points": ["No structured data available"]
            }
        except Exception as e:
            print(f"Error extracting JSON: {e}")
            print(f"Original text: {text}")
            return {
                "summary": "Failed to parse response",
                "key_points": ["Error processing response"]
            }

def count_tokens(text: str) -> int:
    """Count the number of tokens in a text string using tiktoken."""
    try:
        # Use cl100k_base encoding which is used by most recent models
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception as e:
        print(f"Error counting tokens: {e}")
        return 0