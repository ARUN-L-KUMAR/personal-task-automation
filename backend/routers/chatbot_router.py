from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import time
from datetime import datetime, timezone
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    preferred_model: Optional[str] = None  # "auto", "groq", "gemini", "openrouter"


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


def _fetch_context_snapshot() -> dict:
    """
    Fetch structured snapshot of user's live Google data for the context panel.
    Returns dict with next_meeting, unread_emails, pending_tasks, conflicts_today.
    """
    from utils.google_auth import is_authenticated, get_credentials
    from googleapiclient.discovery import build
    import traceback

    snapshot = {
        "next_meeting": None,
        "unread_emails": 0,
        "urgent_emails": 0,
        "pending_tasks": 0,
        "conflicts_today": 0,
        "connected_services": [],
        "authenticated": False,
    }

    if not is_authenticated():
        return snapshot

    snapshot["authenticated"] = True

    try:
        creds = get_credentials()

        # ── Calendar: next meeting + conflicts ──
        try:
            cal = build("calendar", "v3", credentials=creds)
            now = datetime.now(timezone.utc)
            now_iso = now.isoformat()
            eod = now.replace(hour=23, minute=59, second=59).isoformat()

            events_result = cal.events().list(
                calendarId="primary",
                timeMin=now_iso,
                timeMax=eod,
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = events_result.get("items", [])
            snapshot["connected_services"].append("Calendar")

            if events:
                e = events[0]
                start = e.get("start", {}).get("dateTime", e.get("start", {}).get("date", ""))
                end = e.get("end", {}).get("dateTime", e.get("end", {}).get("date", ""))
                snapshot["next_meeting"] = {
                    "title": e.get("summary", "Untitled"),
                    "start": start,
                    "end": end,
                    "location": e.get("location", ""),
                }

                # Simple conflict detection: overlapping events
                conflicts = 0
                for i in range(len(events)):
                    for j in range(i + 1, len(events)):
                        end_i = events[i].get("end", {}).get("dateTime", "")
                        start_j = events[j].get("start", {}).get("dateTime", "")
                        if end_i and start_j and end_i > start_j:
                            conflicts += 1
                snapshot["conflicts_today"] = conflicts
        except Exception:
            pass

        # ── Tasks ──
        try:
            tasks_svc = build("tasks", "v1", credentials=creds)
            task_lists = tasks_svc.tasklists().list(maxResults=1).execute()
            tl_items = task_lists.get("items", [])
            snapshot["connected_services"].append("Tasks")
            if tl_items:
                tl_id = tl_items[0]["id"]
                tasks_result = tasks_svc.tasks().list(
                    tasklist=tl_id, showCompleted=False, maxResults=20
                ).execute()
                snapshot["pending_tasks"] = len(tasks_result.get("items", []))
        except Exception:
            pass

        # ── Gmail ──
        try:
            gmail = build("gmail", "v1", credentials=creds)
            msgs = gmail.users().messages().list(userId="me", q="is:unread", maxResults=20).execute()
            msg_list = msgs.get("messages", [])
            snapshot["unread_emails"] = len(msg_list)
            snapshot["connected_services"].append("Gmail")

            # Check for urgent (flagged important)
            urgent = 0
            for m in msg_list[:10]:
                detail = gmail.users().messages().get(userId="me", id=m["id"], format="metadata", metadataHeaders=["Importance", "X-Priority"]).execute()
                labels = detail.get("labelIds", [])
                if "IMPORTANT" in labels:
                    urgent += 1
            snapshot["urgent_emails"] = urgent
        except Exception:
            pass

    except Exception:
        pass

    return snapshot


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


@router.get("/context-snapshot")
async def get_context_snapshot():
    """Return a structured snapshot of user's live Google data for the context panel."""
    loop = asyncio.get_event_loop()
    try:
        snapshot = await asyncio.wait_for(
            loop.run_in_executor(None, _fetch_context_snapshot),
            timeout=10.0
        )
        return {"status": "success", "snapshot": snapshot}
    except asyncio.TimeoutError:
        return {"status": "timeout", "snapshot": None}
    except Exception as e:
        return {"status": "error", "snapshot": None, "detail": str(e)}


@router.get("/available-models")
async def get_available_models():
    """Return the list of AI models the user can choose from."""
    import os
    models = [
        {"key": "auto", "label": "Auto (Smart Fallback)", "description": "Automatically picks the best available model", "available": True},
        {"key": "groq", "label": "Llama 3.3 70B", "provider": "Groq", "description": "Fast & free, primary model", "available": True},
    ]
    models.append({
        "key": "gemini", "label": "Gemini 2.0 Flash", "provider": "Google",
        "description": "Google's fast multimodal model",
        "available": bool(os.getenv("GOOGLE_API_KEY")),
    })
    models.append({
        "key": "openrouter", "label": "Llama 3.3 70B", "provider": "OpenRouter",
        "description": "Free via OpenRouter",
        "available": bool(os.getenv("OPENROUTER_API_KEY")),
    })
    return {"models": models}

@router.post("/ask")
async def ask_chatbot(request: ChatRequest):
    """
    Fast AI Chatbot:
    - Fetches live Google context in parallel (max 8s timeout)
    - Sends user message + history to LLM
    - Returns reply quickly
    """
    # Fetch live context (8 second cap — never blocks the user longer)
    start_time = time.time()
    context = await _fetch_context_with_timeout(8.0)
    context_fetch_time = time.time() - start_time

    # Determine which context sources were used
    context_sources = []
    if "CALENDAR" in context.upper() and "Unavailable" not in context:
        context_sources.append("Calendar")
    if "TASKS" in context.upper() and "Unavailable" not in context:
        context_sources.append("Tasks")
    if "EMAILS" in context.upper() and "Unavailable" not in context:
        context_sources.append("Email")

    # Determine agents involved based on query
    msg_lower = request.message.lower()
    agents_used = []
    if any(k in msg_lower for k in ["meeting", "calendar", "schedule", "event", "appointment"]):
        agents_used.append("Calendar")
    if any(k in msg_lower for k in ["task", "todo", "pending", "overdue", "priorit"]):
        agents_used.append("Tasks")
    if any(k in msg_lower for k in ["email", "mail", "inbox", "unread", "draft"]):
        agents_used.append("Email")
    if any(k in msg_lower for k in ["conflict", "overlap", "clash"]):
        agents_used.append("Conflict")
    if any(k in msg_lower for k in ["plan", "summarize", "summary", "optimize", "afternoon", "morning", "day"]):
        agents_used.append("Planning")
    if any(k in msg_lower for k in ["travel", "route", "direction", "commute", "map"]):
        agents_used.append("Travel")
    if any(k in msg_lower for k in ["contact", "phone", "person"]):
        agents_used.append("Contacts")
    if not agents_used:
        agents_used.append("Coordinator")

    # Build conversation messages
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    system_prompt = f"""You are G-One, a professional AI Personal Assistant.
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

    # Build ordered list of fallback LLMs based on user preference
    from config.settings import llm, llm_fast, llm_openrouter
    import os

    # All available models
    all_models = {
        "groq": ("groq-primary", llm),
        "gemini": ("gemini-fallback", llm_fast) if os.getenv("GOOGLE_API_KEY") else None,
        "openrouter": ("openrouter-fallback", llm_openrouter) if os.getenv("OPENROUTER_API_KEY") else None,
    }

    preferred = (request.preferred_model or "auto").lower()

    if preferred != "auto" and preferred in all_models and all_models[preferred]:
        # User selected a specific model — use it first, then fallback to others
        fallback_models = [all_models[preferred]]
        for key, val in all_models.items():
            if key != preferred and val:
                fallback_models.append(val)
    else:
        # Auto mode: Groq → Gemini → OpenRouter
        fallback_models = [all_models["groq"]]
        if all_models["gemini"]:
            fallback_models.append(all_models["gemini"])
        if all_models["openrouter"]:
            fallback_models.append(all_models["openrouter"])
    
    # Filter out None entries
    fallback_models = [m for m in fallback_models if m is not None]

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
            total_latency = round(time.time() - start_time, 2)

            # Determine model source
            model_source = "Unknown"
            if "groq" in label.lower():
                model_source = "Groq"
            elif "gemini" in label.lower():
                model_source = "Gemini"
            elif "openrouter" in label.lower():
                model_source = "OpenRouter"

            return {
                "status": "success",
                "reply": response,
                "used_context": "Unavailable" not in context and "error" not in context.lower(),
                "model": model_name,
                "model_source": model_source,
                "latency": total_latency,
                "context_sources": context_sources,
                "agents_used": agents_used,
                "memory_messages": len(request.history or []),
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
