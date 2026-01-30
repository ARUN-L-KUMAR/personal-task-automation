from openai import OpenAI
import os

from config.settings import (
    AI_MODEL_NAME,
    AI_TEMPERATURE,
    AI_MAX_TOKENS,
    OPENROUTER_BASE_URL
)

# Initialize OpenRouter client
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url=OPENROUTER_BASE_URL
)


def llm_explanation_agent(conflicts):
    """
    LLM Explanation Agent:
    Uses configurable AI model to explain conflicts.
    """

    if not conflicts or "No conflicts detected." in conflicts:
        return "Your schedule looks balanced with no conflicts."

    prompt = f"""
    You are a personal AI scheduling assistant.

    Detected scheduling conflicts:
    {conflicts}

    Explain the issue clearly and suggest what the user should do.
    Keep it short and practical.
    """

    try:
        response = client.chat.completions.create(
            model=AI_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=AI_TEMPERATURE,
            max_tokens=AI_MAX_TOKENS
        )

        return response.choices[0].message.content.strip()

    except Exception:
        return (
            "A scheduling conflict was detected. "
            "Please consider rescheduling the task or adjusting the meeting time."
        )
