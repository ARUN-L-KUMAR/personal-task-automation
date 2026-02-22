from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncio
from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


def _fetch_quick_context() -> str:
    """
    Fetch a minimal, fast snapshot of user's live Google data.
    Does NOT run the full agent pipeline — only lightweight direct API calls.
    Times out after 8 seconds and degrades gracefully.
    """
    from utils.google_auth import is_authenticated, get_credentials
    from googleapiclient.discovery import build
    from datetime import datetime, timezone
    import traceback

    if not is_authenticated():
        return "User is not connected to Google services. They can connect via Settings."

    parts = []

    try:
        creds = get_credentials()

        # ── Calendar: next 5 events ──
        try:
            cal = build("calendar", "v3", credentials=creds)
            now = datetime.now(timezone.utc).isoformat()
            events_result = cal.events().list(
                calendarId="primary",
                timeMin=now,
                maxResults=5,
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = events_result.get("items", [])
            if events:
                event_strs = []
                for e in events:
                    start = e.get("start", {}).get("dateTime", e.get("start", {}).get("date", ""))
                    event_strs.append(f"- {e.get('summary', 'Untitled')} @ {start}")
                parts.append("UPCOMING CALENDAR EVENTS:\n" + "\n".join(event_strs))
            else:
                parts.append("CALENDAR: No upcoming events found.")
        except Exception as e:
            parts.append(f"CALENDAR: Unavailable ({type(e).__name__})")

        # ── Tasks: first tasklist, up to 7 tasks ──
        try:
            tasks_svc = build("tasks", "v1", credentials=creds)
            task_lists = tasks_svc.tasklists().list(maxResults=1).execute()
            tl_items = task_lists.get("items", [])
            if tl_items:
                tl_id = tl_items[0]["id"]
                tasks_result = tasks_svc.tasks().list(
                    tasklist=tl_id,
                    showCompleted=False,
                    maxResults=7,
                ).execute()
                task_items = tasks_result.get("items", [])
                if task_items:
                    task_strs = [f"- {t.get('title','')}" + (f" (due {t['due'][:10]})" if t.get('due') else "") for t in task_items]
                    parts.append("PENDING TASKS:\n" + "\n".join(task_strs))
                else:
                    parts.append("TASKS: No pending tasks.")
        except Exception as e:
            parts.append(f"TASKS: Unavailable ({type(e).__name__})")

        # ── Gmail: last 5 unread subject lines ──
        try:
            gmail = build("gmail", "v1", credentials=creds)
            msgs = gmail.users().messages().list(
                userId="me", q="is:unread", maxResults=5
            ).execute()
            msg_list = msgs.get("messages", [])
            subjects = []
            for m in msg_list[:5]:
                detail = gmail.users().messages().get(
                    userId="me", id=m["id"], format="metadata",
                    metadataHeaders=["Subject", "From"]
                ).execute()
                hdrs = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
                subjects.append(f"- {hdrs.get('Subject','(no subject)')} [from {hdrs.get('From','?')}]")
            if subjects:
                parts.append("RECENT UNREAD EMAILS:\n" + "\n".join(subjects))
            else:
                parts.append("EMAILS: No unread emails.")
        except Exception as e:
            parts.append(f"EMAILS: Unavailable ({type(e).__name__})")

    except Exception as e:
        return f"Could not fetch Google data: {str(e)}"

    return "\n\n".join(parts) if parts else "No Google data available."


async def _fetch_context_with_timeout(timeout_sec: float = 8.0) -> str:
    """Run the blocking context fetch in a thread pool with a timeout."""
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _fetch_quick_context),
            timeout=timeout_sec
        )
    except asyncio.TimeoutError:
        return "Context fetch timed out — answering without live data."
    except Exception as e:
        return f"Context error: {str(e)}"


@router.post("/ask")
async def ask_chatbot(request: ChatRequest):
    """
    Fast AI Chatbot:
    - Fetches live Google context in parallel (max 8s timeout)
    - Sends user message + history to LLM
    - Returns reply quickly
    """
    # Fetch live context (8 second cap — never blocks the user longer)
    context = await _fetch_context_with_timeout(8.0)

    # Build conversation messages
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    system_prompt = f"""You are Antigravity, a professional AI Personal Assistant.
You have access to the user's real-time Google data shown below.
Answer concisely and helpfully. Use **bold**, bullet points, and short sentences.
For greetings or general chat, be warm and brief (1-2 sentences).
For data questions, use the context below — if data is missing, say so clearly.

USER'S LIVE GOOGLE DATA:
{context}

Current date/time: {current_time} IST"""

    messages = [("system", system_prompt)]

    # Add prior conversation turns (last 8 messages max)
    for msg in (request.history or [])[-8:]:
        role = "human" if msg.role == "user" else "ai"
        messages.append((role, msg.content))

    messages.append(("human", request.message))

    # Build ordered list of fallback LLMs: Groq (primary) → Gemini → OpenRouter
    from config.settings import llm, llm_fast, llm_openrouter
    import os

    fallback_models = [
        ("groq-primary", llm),           # Groq Llama 3.3 (fast, free)
    ]

    if os.getenv("GOOGLE_API_KEY"):
        fallback_models.append(("gemini-fallback", llm_fast))   # Gemini 2.0 Flash

    if os.getenv("OPENROUTER_API_KEY"):
        fallback_models.append(("openrouter-fallback", llm_openrouter))  # OpenRouter

    last_error = None
    for idx, (label, active_llm) in enumerate(fallback_models):
        try:
            # Extract model name correctly for different classes
            if hasattr(active_llm, 'model_name'):
                model_name = active_llm.model_name
            elif hasattr(active_llm, 'model'):
                model_name = active_llm.model
            else:
                model_name = label

            print(f"DEBUG: Chat attempt {idx+1}/{len(fallback_models)} using {model_name}")

            loop = asyncio.get_event_loop()
            response_msg = await asyncio.wait_for(
                loop.run_in_executor(None, lambda llm=active_llm: llm.invoke(messages)),
                timeout=45.0
            )
            response = response_msg.content

            return {
                "status": "success",
                "reply": response,
                "used_context": "Unavailable" not in context and "error" not in context.lower(),
                "model": model_name
            }

        except Exception as e:
            err_str = str(e)
            last_error = err_str
            is_retryable = any(k in err_str for k in ["429", "402", "503", "500"]) \
                        or "rate" in err_str.lower() \
                        or "spend limit" in err_str.lower() \
                        or "balance" in err_str.lower() \
                        or "overloaded" in err_str.lower()

            print(f"DEBUG: Model {label} failed ({err_str[:80]}), {'trying next fallback...' if is_retryable and idx < len(fallback_models)-1 else 'no more fallbacks'}")

            if is_retryable and idx < len(fallback_models) - 1:
                await asyncio.sleep(0.5)
                continue

            if "429" in err_str or "rate" in err_str.lower():
                detail = "All AI models are rate-limited right now. Please wait a minute and try again."
            elif "402" in err_str or "spend limit" in err_str.lower():
                detail = "API spend limit reached. Please check your API keys."
            elif "api_key" in err_str.lower() or "401" in err_str or "403" in err_str:
                detail = "AI service authentication failed. Check your API keys in the backend .env file."
            else:
                detail = f"AI error: {err_str[:200]}"
            raise HTTPException(status_code=502, detail=detail)

    raise HTTPException(status_code=502, detail=f"All AI models failed. Last error: {str(last_error)[:200]}")
