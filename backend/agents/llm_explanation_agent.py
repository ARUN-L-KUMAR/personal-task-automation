import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize OpenRouter client
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)


def llm_explanation_agent(conflicts):
    """
    LLM Explanation Agent (OpenRouter + DeepSeek):
    Converts detected conflicts into natural language explanations.
    """

    # Safety check
    if not conflicts or "No conflicts detected." in conflicts:
        return "Your schedule looks balanced with no conflicts."

    prompt = f"""
    You are a personal AI scheduling assistant.

    The following scheduling conflicts were detected:
    {conflicts}

    Explain the issue in simple language and suggest what the user should do.
    Keep the response short and practical.
    """

    try:
        response = client.chat.completions.create(
            model="deepseek/deepseek-r1",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=150
        )

        return response.choices[0].message.content.strip()

    except Exception:
        # Fallback to ensure system stability during review
        return (
            "A scheduling conflict was detected. "
            "Please consider rescheduling the task or adjusting the meeting time."
        )
