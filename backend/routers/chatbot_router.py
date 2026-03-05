from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import time
from datetime import datetime, timezone
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from database.models import User
from database.connection import get_db
from sqlalchemy.orm import Session
from middleware import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ── Context cache (avoids re-fetching Google data on every chat message) ──
_context_cache = {"data": None, "timestamp": 0.0}
_snapshot_cache = {"data": None, "timestamp": 0.0}
_CONTEXT_CACHE_TTL = 45  # seconds — fresh enough, avoids repeated slow fetches


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    preferred_model: Optional[str] = None  # "auto", "groq", "gemini", "openrouter"


def _fetch_quick_context(user: User, db: Session) -> str:
    """
    Fetch a minimal, fast snapshot of user's live Google data.
    Builds all service clients first, then fetches Calendar, Tasks, Gmail in PARALLEL.
    """
    from utils.google_auth import is_authenticated, get_credentials
    from googleapiclient.discovery import build
    from datetime import datetime, timezone
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import time as _time

    if not is_authenticated(user):
        return "User is not connected to Google services. They can connect via Settings."

    creds = get_credentials(user, db)

    # Build all service clients upfront (these are thread-safe for read)
    t0 = _time.time()
    cal_svc = build("calendar", "v3", credentials=creds)
    tasks_svc = build("tasks", "v1", credentials=creds)
    gmail_svc = build("gmail", "v1", credentials=creds)
    print(f"DEBUG context: Service builds took {_time.time()-t0:.1f}s")

    def fetch_calendar():
        try:
            now = datetime.now(timezone.utc).isoformat()
            events_result = cal_svc.events().list(
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
                return "UPCOMING CALENDAR EVENTS:\n" + "\n".join(event_strs)
            return "CALENDAR: No upcoming events found."
        except Exception as e:
            return f"CALENDAR: Unavailable ({type(e).__name__})"

    def fetch_tasks():
        try:
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
                    return "PENDING TASKS:\n" + "\n".join(task_strs)
                return "TASKS: No pending tasks."
            return "TASKS: No task lists found."
        except Exception as e:
            return f"TASKS: Unavailable ({type(e).__name__})"

    def fetch_gmail():
        try:
            msgs = gmail_svc.users().messages().list(
                userId="me", q="is:unread", maxResults=5
            ).execute()
            msg_list = msgs.get("messages", [])
            if not msg_list:
                return "EMAILS: No unread emails."

            # Batch fetch — single HTTP request for all message metadata
            subjects = []
            batch_results = {}

            def msg_callback(request_id, response, exception):
                if exception is None:
                    batch_results[request_id] = response

            batch = gmail_svc.new_batch_http_request(callback=msg_callback)
            for i, m in enumerate(msg_list[:5]):
                batch.add(
                    gmail_svc.users().messages().get(
                        userId="me", id=m["id"], format="metadata",
                        metadataHeaders=["Subject", "From"]
                    ),
                    request_id=str(i)
                )
            batch.execute()

            for i in range(min(5, len(msg_list))):
                detail = batch_results.get(str(i))
                if detail:
                    hdrs = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
                    subjects.append(f"- {hdrs.get('Subject','(no subject)')} [from {hdrs.get('From','?')}]")

            if subjects:
                return "RECENT UNREAD EMAILS:\n" + "\n".join(subjects)
            return f"EMAILS: {len(msg_list)} unread emails (details unavailable)."
        except Exception as e:
            return f"EMAILS: Unavailable ({type(e).__name__})"

    # Run all three fetches in parallel
    parts = []
    t1 = _time.time()
    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(fetch_calendar): "calendar",
                executor.submit(fetch_tasks): "tasks",
                executor.submit(fetch_gmail): "gmail",
            }
            for future in as_completed(futures, timeout=12):
                try:
                    parts.append(future.result())
                except Exception:
                    parts.append(f"{futures[future].upper()}: Fetch error")
    except Exception as e:
        return f"Could not fetch Google data: {str(e)}"

    print(f"DEBUG context: Parallel fetches took {_time.time()-t1:.1f}s (total {_time.time()-t0:.1f}s)")
    return "\n\n".join(parts) if parts else "No Google data available."


def _fetch_context_snapshot(user: User, db: Session) -> dict:
    """
    Fetch structured snapshot of user's live Google data for the context panel.
    Returns dict with next_meeting, unread_emails, pending_tasks, conflicts_today.
    Uses parallel threads for Calendar, Tasks, Gmail to minimize latency.
    """
    from utils.google_auth import is_authenticated, get_credentials
    from googleapiclient.discovery import build
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import time as _time

    snapshot = {
        "next_meeting": None,
        "unread_emails": 0,
        "urgent_emails": 0,
        "pending_tasks": 0,
        "conflicts_today": 0,
        "connected_services": [],
        "authenticated": False,
    }

    if not is_authenticated(user):
        print("DEBUG snapshot: Not authenticated")
        return snapshot

    snapshot["authenticated"] = True
    t0 = _time.time()

    try:
        creds = get_credentials(user, db)
    except Exception as e:
        print(f"DEBUG snapshot: get_credentials failed: {e}")
        return snapshot

    # ── Define per-service fetch functions ──

    def fetch_calendar():
        result = {"connected": False, "next_meeting": None, "conflicts": 0}
        try:
            cal = build("calendar", "v3", credentials=creds)
            now = datetime.now(timezone.utc)
            events_result = cal.events().list(
                calendarId="primary",
                timeMin=now.isoformat(),
                timeMax=now.replace(hour=23, minute=59, second=59).isoformat(),
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = events_result.get("items", [])
            result["connected"] = True
            if events:
                e = events[0]
                start = e.get("start", {}).get("dateTime", e.get("start", {}).get("date", ""))
                end = e.get("end", {}).get("dateTime", e.get("end", {}).get("date", ""))
                result["next_meeting"] = {
                    "title": e.get("summary", "Untitled"),
                    "start": start, "end": end,
                    "location": e.get("location", ""),
                }
                conflicts = 0
                for i in range(len(events)):
                    for j in range(i + 1, len(events)):
                        end_i = events[i].get("end", {}).get("dateTime", "")
                        start_j = events[j].get("start", {}).get("dateTime", "")
                        if end_i and start_j and end_i > start_j:
                            conflicts += 1
                result["conflicts"] = conflicts
        except Exception as e:
            print(f"DEBUG snapshot calendar error: {e}")
        return result

    def fetch_tasks():
        result = {"connected": False, "pending": 0}
        try:
            tasks_svc = build("tasks", "v1", credentials=creds)
            task_lists = tasks_svc.tasklists().list(maxResults=1).execute()
            tl_items = task_lists.get("items", [])
            result["connected"] = True
            if tl_items:
                tl_id = tl_items[0]["id"]
                tasks_result = tasks_svc.tasks().list(
                    tasklist=tl_id, showCompleted=False, maxResults=20
                ).execute()
                result["pending"] = len(tasks_result.get("items", []))
        except Exception as e:
            print(f"DEBUG snapshot tasks error: {e}")
        return result

    def fetch_gmail():
        result = {"connected": False, "unread": 0, "urgent": 0}
        try:
            gmail = build("gmail", "v1", credentials=creds)
            msgs = gmail.users().messages().list(userId="me", q="is:unread", maxResults=20).execute()
            result["unread"] = len(msgs.get("messages", []))
            result["connected"] = True
            try:
                urgent_msgs = gmail.users().messages().list(
                    userId="me", q="is:unread is:important", maxResults=20
                ).execute()
                result["urgent"] = len(urgent_msgs.get("messages", []))
            except Exception:
                pass
        except Exception as e:
            print(f"DEBUG snapshot gmail error: {e}")
        return result

    # ── Run all three in parallel ──
    cal_result = {"connected": False, "next_meeting": None, "conflicts": 0}
    tasks_result = {"connected": False, "pending": 0}
    gmail_result = {"connected": False, "unread": 0, "urgent": 0}

    try:
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_cal = executor.submit(fetch_calendar)
            future_tasks = executor.submit(fetch_tasks)
            future_gmail = executor.submit(fetch_gmail)

            for future in as_completed([future_cal, future_tasks, future_gmail], timeout=15):
                try:
                    future.result()
                except Exception:
                    pass

            try:
                cal_result = future_cal.result(timeout=0)
            except Exception:
                pass
            try:
                tasks_result = future_tasks.result(timeout=0)
            except Exception:
                pass
            try:
                gmail_result = future_gmail.result(timeout=0)
            except Exception:
                pass
    except Exception as e:
        print(f"DEBUG snapshot parallel error: {e}")

    # ── Assemble snapshot ──
    if cal_result["connected"]:
        snapshot["connected_services"].append("Calendar")
        snapshot["next_meeting"] = cal_result["next_meeting"]
        snapshot["conflicts_today"] = cal_result["conflicts"]

    if tasks_result["connected"]:
        snapshot["connected_services"].append("Tasks")
        snapshot["pending_tasks"] = tasks_result["pending"]

    if gmail_result["connected"]:
        snapshot["connected_services"].append("Gmail")
        snapshot["unread_emails"] = gmail_result["unread"]
        snapshot["urgent_emails"] = gmail_result["urgent"]

    print(f"DEBUG snapshot: Parallel fetch completed in {_time.time()-t0:.1f}s — services: {snapshot['connected_services']}")
    return snapshot


async def _fetch_context_with_timeout(user: User, db: Session, timeout_sec: float = 15.0) -> str:
    """Run the blocking context fetch in a thread pool with a timeout.
    Uses a 45-second cache to avoid re-fetching on consecutive chat messages."""
    import time as _time

    # Return cached context if fresh
    now = _time.time()
    if _context_cache["data"] and (now - _context_cache["timestamp"]) < _CONTEXT_CACHE_TTL:
        print(f"DEBUG context: Using cached data ({now - _context_cache['timestamp']:.0f}s old)")
        return _context_cache["data"]

    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: _fetch_quick_context(user, db)),
            timeout=timeout_sec
        )
        # Cache the result
        _context_cache["data"] = result
        _context_cache["timestamp"] = _time.time()
        return result
    except asyncio.TimeoutError:
        # If we have stale cache, use it rather than returning nothing
        if _context_cache["data"]:
            print("DEBUG context: Timeout — using stale cache")
            return _context_cache["data"]
        return "Context fetch timed out — answering without live data."
    except Exception as e:
        if _context_cache["data"]:
            return _context_cache["data"]
        return f"Context error: {str(e)}"


@router.get("/context-snapshot")
async def get_context_snapshot(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return a structured snapshot of user's live Google data for the context panel."""
    import time as _time

    # Return cached snapshot if fresh
    now = _time.time()
    if _snapshot_cache["data"] and (now - _snapshot_cache["timestamp"]) < _CONTEXT_CACHE_TTL:
        return {"status": "success", "snapshot": _snapshot_cache["data"]}

    loop = asyncio.get_event_loop()
    try:
        snapshot = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: _fetch_context_snapshot(current_user, db)),
            timeout=20.0
        )
        _snapshot_cache["data"] = snapshot
        _snapshot_cache["timestamp"] = _time.time()
        return {"status": "success", "snapshot": snapshot}
    except asyncio.TimeoutError:
        import logging
        logging.warning("Context snapshot timed out after 20s")
        # Return stale cache if available
        if _snapshot_cache["data"]:
            return {"status": "success", "snapshot": _snapshot_cache["data"]}
        return {"status": "timeout", "snapshot": None}
    except Exception as e:
        import logging
        logging.error(f"Context snapshot error: {e}")
        if _snapshot_cache["data"]:
            return {"status": "success", "snapshot": _snapshot_cache["data"]}
        return {"status": "error", "snapshot": None, "detail": str(e)}


@router.get("/available-models")
async def get_available_models():
    """Return the list of AI models the user can choose from."""
    import os
    models = [
        {"key": "auto", "label": "Auto (Smart Fallback)", "description": "Automatically picks the best available model", "available": True},
        {"key": "groq", "label": "Llama 3.3 70B", "provider": "Groq", "description": "Fast & free, primary model", "available": True},
    ]
    has_google = bool(os.getenv("GOOGLE_API_KEY"))
    models.append({
        "key": "gemini-2.5-flash", "label": "Gemini 2.5 Flash", "provider": "Google",
        "description": "Best quality · 5 RPM / 20 RPD",
        "available": has_google,
    })
    models.append({
        "key": "gemini-2.5-flash-lite", "label": "Gemini 2.5 Flash Lite", "provider": "Google",
        "description": "Fastest · 30 RPM / 1500 RPD",
        "available": has_google,
    })
    has_or = bool(os.getenv("OPENROUTER_API_KEY"))
    models.append({
        "key": "openrouter", "label": "Nemotron 30B", "provider": "OpenRouter",
        "description": "Free · 256K context · Best fallback",
        "available": has_or,
    })
    models.append({
        "key": "openrouter-alt", "label": "Trinity Large", "provider": "OpenRouter",
        "description": "Free · 131K context · Fast",
        "available": has_or,
    })
    models.append({
        "key": "openrouter-alt2", "label": "Solar Pro 3", "provider": "OpenRouter",
        "description": "Free · 128K context · Reliable",
        "available": has_or,
    })
    return {"models": models}

@router.post("/ask")
async def ask_chatbot(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fast AI Chatbot:
    - Fetches live Google context in parallel (max 8s timeout)
    - Sends user message + history to LLM
    - Returns reply quickly
    """
    # Fetch live context (15 second cap — parallel fetch)
    start_time = time.time()
    context = await _fetch_context_with_timeout(current_user, db, 15.0)
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
    from config.settings import llm, llm_gemini_25_flash, llm_gemini_25_lite, llm_openrouter, llm_openrouter_alt, llm_openrouter_alt2
    import os

    has_google = bool(os.getenv("GOOGLE_API_KEY"))
    has_or = bool(os.getenv("OPENROUTER_API_KEY"))

    # All available models
    all_models = {
        "groq": ("groq-primary", llm),
        "gemini-2.5-flash": ("gemini-2.5-flash", llm_gemini_25_flash) if has_google else None,
        "gemini-2.5-flash-lite": ("gemini-2.5-flash-lite", llm_gemini_25_lite) if has_google else None,
        "openrouter": ("openrouter-nemotron-30b", llm_openrouter) if has_or else None,
        "openrouter-alt": ("openrouter-trinity-large", llm_openrouter_alt) if has_or else None,
        "openrouter-alt2": ("openrouter-solar-pro", llm_openrouter_alt2) if has_or else None,
    }

    preferred = (request.preferred_model or "auto").lower()

    if preferred != "auto" and preferred in all_models and all_models[preferred]:
        # User selected a specific model — use it first, then fallback to others
        fallback_models = [all_models[preferred]]
        # If user selected openrouter, add all alt models right after
        if preferred == "openrouter":
            for alt_key in ["openrouter-alt", "openrouter-alt2"]:
                if all_models.get(alt_key):
                    fallback_models.append(all_models[alt_key])
        for key, val in all_models.items():
            if key != preferred and not key.startswith("openrouter-alt") and val:
                fallback_models.append(val)
    else:
        # Auto order (benchmarked): Groq → Gemini Lite → Nemotron 30B → Gemini Flash → Trinity Large → Solar Pro
        fallback_order = ["groq", "gemini-2.5-flash-lite", "openrouter", "gemini-2.5-flash", "openrouter-alt", "openrouter-alt2"]
        fallback_models = []
        for fkey in fallback_order:
            if all_models.get(fkey):
                fallback_models.append(all_models[fkey])
    
    # Filter out None entries
    fallback_models = [m for m in fallback_models if m is not None]

    last_error = None
    failed_models = []  # Track which models failed (for fallback notice)
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

            # Determine model source and friendly model key
            model_source = "Unknown"
            actual_model_key = label  # e.g. "gemini-2.5-flash", "groq-primary"
            if "groq" in label.lower():
                model_source = "Groq"
                actual_model_key = "groq"
            elif "gemini-2.5-flash-lite" in label.lower():
                model_source = "Gemini 2.5 Flash Lite"
                actual_model_key = "gemini-2.5-flash-lite"
            elif "gemini-2.5-flash" in label.lower():
                model_source = "Gemini 2.5 Flash"
                actual_model_key = "gemini-2.5-flash"
            elif "openrouter-solar" in label.lower():
                model_source = "OpenRouter (Solar Pro 3)"
                actual_model_key = "openrouter-alt2"
            elif "openrouter-trinity" in label.lower():
                model_source = "OpenRouter (Trinity Large)"
                actual_model_key = "openrouter-alt"
            elif "openrouter" in label.lower():
                model_source = "OpenRouter (Nemotron 30B)"
                actual_model_key = "openrouter"

            # Build fallback notice if user explicitly selected a model that failed
            fallback_notice = None
            if preferred != "auto" and failed_models:
                model_labels = {
                    "groq": "Groq (Llama 3.3)",
                    "gemini-2.5-flash": "Gemini 2.5 Flash",
                    "gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
                    "openrouter": "OpenRouter (Nemotron 30B)",
                    "openrouter-alt": "OpenRouter (Trinity Large)",
                    "openrouter-alt2": "OpenRouter (Solar Pro 3)",
                }
                fallback_notice = {
                    "preferred_model": model_labels.get(preferred, preferred),
                    "actual_model": model_source,
                    "actual_model_key": actual_model_key,
                    "reason": "rate_limit" if any("429" in e or "rate" in e.lower() for e in failed_models) else "unavailable",
                }

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
                "fallback_notice": fallback_notice,
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
                failed_models.append(err_str[:200])
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
