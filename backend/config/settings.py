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

# ── Resilient Fallback Wrapper for Multi-Agent Reliability ──
class ResilientChatModel(BaseChatModel):
    """Wrapper that tries candidates sequentially in case of rate-limits or errors."""
    candidates: List[Any] = []
    model_name_val: str = "resilient-fallback-model"

    @property
    def _llm_type(self) -> str:
        return "resilient_fallback"

    @property
    def model_name(self) -> str:
        return self.model_name_val

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs) -> ChatResult:
        errors = []
        for i, candidate in enumerate(self.candidates):
            try:
                name = getattr(candidate, "model_name", getattr(candidate, "model", candidate.__class__.__name__))
                print(f"INFO: ResilientChatModel calling candidate {i+1}/{len(self.candidates)}: {name}")
                config = {}
                if stop:
                    config["stop"] = stop
                res = candidate.invoke(messages, config=config, **kwargs)
                return ChatResult(generations=[ChatGeneration(message=res)])
            except Exception as e:
                err_msg = str(e)
                errors.append(f"{candidate.__class__.__name__}: {err_msg[:120]}")
                print(f"WARNING: ResilientChatModel candidate {i+1} failed: {err_msg[:200]}")
                
        raise Exception(f"All candidates in ResilientChatModel failed. Errors: {'; '.join(errors)}")

# ── Load and default AI config variables from environment ──
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "llama3-70b-8192")
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", "0.4"))
try:
    AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "2000"))
except ValueError:
    AI_MAX_TOKENS = 2000

# Enforce a safe minimum for structured multi-agent outputs
if AI_MAX_TOKENS < 1000:
    print(f"WARNING: requested AI_MAX_TOKENS={AI_MAX_TOKENS} is too low. Elevating to 2000 to prevent JSON truncation.")
    AI_MAX_TOKENS = 2000

# Helper to create specific model instances dynamically
def create_llm_instance(model_name: str, temperature: float, max_tokens: int) -> BaseChatModel:
    model_name_lower = model_name.lower()
    
    # 1. Google Gemini
    if model_name_lower.startswith("gemini") and os.getenv("GOOGLE_API_KEY"):
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=temperature,
            max_output_tokens=max_tokens,
            max_retries=1,
        )
        
    # 2. OpenRouter (usually contains a slash, or explicitly requested)
    if ("/" in model_name or "openrouter" in model_name_lower) and os.getenv("OPENROUTER_API_KEY"):
        return ChatOpenRouter(
            model=model_name,
            api_key=os.getenv("OPENROUTER_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
    # 3. Groq
    if os.getenv("GROQ_API_KEY") and any(x in model_name_lower for x in ["llama", "mixtral", "gemma", "groq"]):
        return ChatGroq(
            model=model_name,
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
            request_timeout=40,
        )
        
    # Fallback to key-based default instantiation
    if os.getenv("GROQ_API_KEY"):
        return ChatGroq(
            model="llama3-70b-8192",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
            request_timeout=40,
        )
    elif os.getenv("GOOGLE_API_KEY"):
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
    elif os.getenv("OPENROUTER_API_KEY"):
        return ChatOpenRouter(
            model="nvidia/nemotron-3-nano-30b-a3b:free",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
        )
    else:
        raise ValueError("No LLM API keys found in environment variables (.env)")

# Helper to construct fallback list
def get_fallback_candidates(temperature: float, max_tokens: int) -> List[BaseChatModel]:
    candidates = []
    
    # Add Groq fallback
    if os.getenv("GROQ_API_KEY"):
        candidates.append(ChatGroq(
            model="llama3-70b-8192",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
            request_timeout=40,
        ))
        
    # Add Gemini fallback
    if os.getenv("GOOGLE_API_KEY"):
        candidates.append(ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=temperature,
            max_output_tokens=max_tokens,
            max_retries=1,
        ))
        candidates.append(ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=temperature,
            max_output_tokens=max_tokens,
            max_retries=1,
        ))
        
    # Add OpenRouter free models
    if os.getenv("OPENROUTER_API_KEY"):
        candidates.append(ChatOpenRouter(
            model="nvidia/nemotron-3-nano-30b-a3b:free",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
        ))
        candidates.append(ChatOpenRouter(
            model="arcee-ai/trinity-large-preview:free",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
        ))
        candidates.append(ChatOpenRouter(
            model="upstage/solar-pro-3:free",
            api_key=os.getenv("OPENROUTER_API_KEY"),
            temperature=temperature,
            max_tokens=max_tokens,
        ))
        
    return candidates

# Instantiate candidates lists
primary_llm = create_llm_instance(AI_MODEL_NAME, AI_TEMPERATURE, AI_MAX_TOKENS)
fallbacks = get_fallback_candidates(AI_TEMPERATURE, AI_MAX_TOKENS)

all_candidates = [primary_llm]
for fb in fallbacks:
    fb_model = getattr(fb, "model_name", getattr(fb, "model", ""))
    prim_model = getattr(primary_llm, "model_name", getattr(primary_llm, "model", ""))
    if fb_model == prim_model and fb.__class__ == primary_llm.__class__:
        continue
    all_candidates.append(fb)

# ── Primary Exported llm (Resilient Fallback Model) ──
llm = ResilientChatModel(candidates=all_candidates, model_name_val=getattr(primary_llm, "model_name", "resilient-llm"))

# Instantiate heavy candidates
primary_heavy = create_llm_instance(AI_MODEL_NAME, 0.2, 2048)
heavy_fallbacks = get_fallback_candidates(0.2, 2048)

all_heavy_candidates = [primary_heavy]
for fb in heavy_fallbacks:
    fb_model = getattr(fb, "model_name", getattr(fb, "model", ""))
    prim_model = getattr(primary_heavy, "model_name", getattr(primary_heavy, "model", ""))
    if fb_model == prim_model and fb.__class__ == primary_heavy.__class__:
        continue
    all_heavy_candidates.append(fb)

# ── Heavy Exported llm (Resilient Fallback Model for Planner) ──
llm_heavy = ResilientChatModel(candidates=all_heavy_candidates, model_name_val=getattr(primary_heavy, "model_name", "resilient-heavy-llm"))

# ── Gemini Models (Google free tier) — Kept for backwards compatibility with Chatbot router ──
llm_gemini_25_flash = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
    max_output_tokens=1500,
    max_retries=1,
)

llm_gemini_25_lite = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.4,
    max_output_tokens=1000,
    max_retries=1,
)

llm_fast = llm_gemini_25_flash

# ── Fallback Models — Kept for backwards compatibility with Chatbot router ──
llm_openrouter = ChatOpenRouter(
    model="nvidia/nemotron-3-nano-30b-a3b:free",
    api_key=os.getenv("OPENROUTER_API_KEY") or "",
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

llm_openrouter_alt = ChatOpenRouter(
    model="arcee-ai/trinity-large-preview:free",
    api_key=os.getenv("OPENROUTER_API_KEY") or "",
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

llm_openrouter_alt2 = ChatOpenRouter(
    model="upstage/solar-pro-3:free",
    api_key=os.getenv("OPENROUTER_API_KEY") or "",
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)
