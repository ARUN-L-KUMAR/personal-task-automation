import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from typing import List, Optional, Any
import requests as _requests

# Load environment variables from .env
load_dotenv()


# ── Custom OpenRouter LLM (bypasses broken openai SDK streaming) ──
class ChatOpenRouter(BaseChatModel):
    """Lightweight OpenRouter wrapper using requests directly."""
    model: str = ""
    api_key: str = ""
    temperature: float = 0.4
    max_tokens: int = 1000
    request_timeout: int = 40

    @property
    def _llm_type(self) -> str:
        return "openrouter"

    @property
    def model_name(self) -> str:
        return self.model

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs) -> ChatResult:
        formatted = []
        for m in messages:
            if isinstance(m, SystemMessage):
                formatted.append({"role": "system", "content": m.content})
            elif isinstance(m, HumanMessage):
                formatted.append({"role": "user", "content": m.content})
            elif isinstance(m, AIMessage):
                formatted.append({"role": "assistant", "content": m.content})
            else:
                # Handle tuple-style messages from chatbot_router
                formatted.append({"role": "user", "content": str(m.content)})

        payload = {
            "model": self.model,
            "messages": formatted,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        if stop:
            payload["stop"] = stop

        resp = _requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self.request_timeout,
        )

        if resp.status_code != 200:
            raise Exception(f"OpenRouter {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])

# ── Primary Model: Groq (fast, free tier, reliable) ──
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

# ── Gemini Models (Google free tier) ──
# gemini-2.5-flash: Best quality, 5 RPM / 20 RPD
llm_gemini_25_flash = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
    max_output_tokens=1500,
    max_retries=1,
)

# gemini-2.5-flash-lite: Fastest, 30 RPM / 1500 RPD
llm_gemini_25_lite = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
    max_output_tokens=1000,
    max_retries=1,
)

# Keep llm_fast as alias for backward compatibility (used by agents)
llm_fast = llm_gemini_25_flash

# ── Fallback 2: OpenRouter (backup — best free model) ──
llm_openrouter = ChatOpenRouter(
    model="nvidia/nemotron-3-nano-30b-a3b:free",
    api_key=os.getenv("OPENROUTER_API_KEY") or "",
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

# ── Fallback 3: OpenRouter alternate free model ──
llm_openrouter_alt = ChatOpenRouter(
    model="arcee-ai/trinity-large-preview:free",
    api_key=os.getenv("OPENROUTER_API_KEY") or "",
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

# ── Fallback 4: OpenRouter third free model ──
llm_openrouter_alt2 = ChatOpenRouter(
    model="upstage/solar-pro-3:free",
    api_key=os.getenv("OPENROUTER_API_KEY") or "",
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
