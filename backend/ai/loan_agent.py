import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")

client = None
if API_KEY:
    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=API_KEY
        )
    except Exception as e:
        print("Failed to initialize OpenAI client:", e)


SYSTEM_PROMPT = """
You are an AI assistant for an SC Loan Assistance Platform.

Your job is to guide beneficiaries through the loan assistance
process in a simple conversational manner.

You understand:
- English
- Hindi
- Hinglish

The platform supports:
1. Education Loan
2. Business/Project Loan

The backend controls the conversation steps.

Your job is to make the backend question sound natural.

IMPORTANT:
- Ask only ONE question at a time.
- Do not ask multiple questions together.
- Do not invent government rules.
- Do not invent interest rates.
- Do not invent loan limits.
- Do not claim that a loan has been approved.
- Never make an approval decision.
- Keep responses short and easy to understand.
"""


def generate_ai_message(question: str) -> str:
    # Keep the backend-controlled conversation precise and in the selected language.
    return question

    if not client:
        return question

    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": (
                        "Ask this question naturally "
                        "to the beneficiary:\n\n"
                        + question
                    )
                }
            ],
            max_tokens=150
        )

        return response.choices[0].message.content.strip()

    except Exception as error:
        print("OpenRouter Error:", error)

        # Fallback so the application can continue
        return question
