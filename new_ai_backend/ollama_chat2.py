from ollama import Client
import json
from typing import Dict, Any, Optional
import time

def chat_ollama(sys_prompt: str, user_prompt: str, model: str = "gemma3:4b-it-qat", max_retries: int = 3) -> str:
    """
    Chat with Ollama model with retries and better error handling.
    """
    for attempt in range(max_retries):
        try:
            client = Client(host='http://localhost:11434')
            
            # Prepare messages
            messages = [
                {'role': 'system', 'content': sys_prompt},
                {'role': 'user', 'content': user_prompt}
            ]
            
            print(f"Sending request to Ollama (attempt {attempt + 1}/{max_retries})")
            print(f"Model: {model}")
            print(f"System prompt: {sys_prompt[:100]}...")
            print(f"User prompt: {user_prompt}")
            
            # Get response
            response = client.chat(model=model, messages=messages)
            
            # Extract content from response
            if isinstance(response, dict):
                content = response.get('message', {}).get('content', '')
                print(f"Received response from Ollama (dict): {content[:100]}...")
                return content
            elif hasattr(response, 'message'):
                content = response.message.content
                print(f"Received response from Ollama (object): {content[:100]}...")
                return content
            else:
                content = str(response)
                print(f"Received response from Ollama (other): {content[:100]}...")
                return content
                
        except Exception as e:
            print(f"Error in chat_ollama (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                print(f"Retrying in 2 seconds...")
                time.sleep(2)
            else:
                print("Max retries reached, raising error")
                raise e
    
    raise Exception("Failed to get response from Ollama after max retries")

def extract_json(text: str) -> Dict[str, Any]:
    """
    Extract JSON from text response.
    
    Args:
        text (str): Text containing JSON
    
    Returns:
        Dict: Extracted JSON as dictionary
    """
    try:
        # Find JSON-like structure in text
        start_idx = text.find('{')
        end_idx = text.rfind('}') + 1
        
        if start_idx == -1 or end_idx == 0:
            return {}
            
        json_str = text[start_idx:end_idx]
        return json.loads(json_str)
    except Exception as e:
        print(f"Error extracting JSON: {str(e)}")
        return {}

# print(ollama_chat("You are a helpful assistant", "What is the capital of France?"))