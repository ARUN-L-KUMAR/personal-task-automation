import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

# Load environment variables from .env
load_dotenv()

# ── Primary Model: Groq (fast, free tier, reliable) ──
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

# ── Fallback 1: Google Gemini (Direct) ──
llm_fast = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
    max_output_tokens=1000,
)

# ── Fallback 2: OpenRouter (backup) ──
llm_openrouter = ChatOpenAI(
    model="meta-llama/llama-3.3-70b-instruct:free",
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

# ── Heavy model for Planner (complex analysis) ──
llm_heavy = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.2,
    max_tokens=2048,
    request_timeout=60,
)
