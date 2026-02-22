import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# Load environment variables from .env
load_dotenv()

# OpenRouter-compatible LLM setup
llm = ChatOpenAI(
    model="deepseek/deepseek-r1",   # free model
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    temperature=0.3,
    max_tokens=1024  # keep within free tier credit limits
)
