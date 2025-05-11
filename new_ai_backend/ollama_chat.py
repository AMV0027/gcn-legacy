from ollama import Client
import json
from typing import Dict, Any, Optional

def chat_ollama(sys_prompt: str, user_prompt: str, model: str = "gemma3:4b") -> str:
    try:
        client = Client(host='http://localhost:11434')
        
        # Prepare messages
        messages = [
            {'role': 'system', 'content': sys_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        # Get response
        response = client.chat(model=model, messages=messages)
        
        # Extract content from response
        if isinstance(response, dict):
            print(f"AI Response: {response.get('message', {}).get('content', '')}")
            return response.get('message', {}).get('content', '')
        elif hasattr(response, 'message'):
            print(f"AI Response: {response.message.content}")
            return response.message.content
        else:
            print(f"AI Response: {str(response)}")
            return str(response)
            
    except Exception as e:
        print(f"Error in chat_ollama: {str(e)}")
        # Return a fallback response
        return f"I apologize, but I encountered an error processing your request. Please try again. Error: {str(e)}"

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