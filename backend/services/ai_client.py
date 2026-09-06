import os
from typing import Tuple, Optional, Any, List
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def get_ai_client() -> Tuple[Optional[OpenAI], str]:
    """
    Returns an initialized OpenAI-compatible client and the corresponding model name.
    Supports Google Gemini (via OpenAI compatibility endpoint) and OpenRouter.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None, "gemini-3.5-flash-lite"

    api_key_clean = api_key.strip()

    if api_key_clean.startswith("AQ.") or api_key_clean.startswith("AIza"):
        try:
            client = OpenAI(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=api_key_clean
            )
            return client, "gemini-3.5-flash-lite"
        except Exception as e:
            print("Gemini OpenAI client init error:", e)
            return None, "gemini-3.5-flash-lite"
    else:
        try:
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key_clean
            )
            return client, "openrouter/auto"
        except Exception as e:
            print("OpenRouter client init error:", e)
            return None, "openrouter/auto"


def call_ai_chat_resilient(messages: List[dict], temperature: float = 0.3, max_tokens: int = 1000) -> Optional[str]:
    """
    Calls AI with auto-fallback rotation across models to guarantee zero 429 quota failures.
    """
    client, primary_model = get_ai_client()
    if not client:
        return None

    candidate_models = [
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-3.6-flash"
    ] if primary_model.startswith("gemini") else [primary_model]

    for model_name in candidate_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            content = (response.choices[0].message.content or "").strip()
            if content:
                return content
        except Exception as e:
            err_str = str(e)
            if any(term in err_str for term in ["429", "RESOURCE_EXHAUSTED", "404", "503", "quota"]):
                continue
            else:
                print(f"AI Call error on model {model_name}:", e)
                continue

    return None
