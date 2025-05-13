from ollama import Client
import json
from typing import Dict, Any, Optional
import time
from openai import OpenAI

def chat_ollama(sys_prompt: str, user_prompt: str, model: str = "gemma3:4b-it-qat", max_retries: int = 3) -> str:
    """
    Chat with Ollama model with retries and better error handling.
    """
    for attempt in range(max_retries):
        try:
            client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key="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",
            )

            completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
                "X-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
            },
            extra_body={},
            model="google/gemma-3-12b-it:free",
            messages=[
                {
                "role": "system",
                "content": sys_prompt,
                },
                {
                "role": "user",
                "content": user_prompt,
                }
            ]
            )
            return completion.choices[0].message.content
                
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