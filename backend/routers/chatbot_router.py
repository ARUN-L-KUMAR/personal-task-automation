from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import time
import os
from datetime import datetime, timezone
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from database.models import User
from database.connection import get_db
from sqlalchemy.orm import Session
from middleware import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ── Centralized User Data Cache (Per-user, eliminates redundant Google API calls) ──
_user_data_cache = {}  # {user_id: {"data": dict, "timestamp": float}}
_CACHE_TTL = 60  # seconds — fresh enough for 10-agent context panel & chatbot snapshot


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    preferred_model: Optional[str] = None  # "auto", "groq", "gemini", "openrouter"


def _get_raw_data(user: User, db: Session) -> dict:
    """
    Fetch raw data from all relevant Google services in parallel.
    This is the single source of truth for both snapshots and chatbot context.
    """
    from utils.google_auth import is_authenticated, get_credentials
    from googleapiclient.discovery import build
    from datetime import datetime, timezone
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import time as _time

    results = {
        "calendar": [], "tasks": [], "gmail": [], 
        "contacts": False, "sheets": [], "timestamp": _time.time()
    }

    if not is_authenticated(user, db):
        return results

    creds = get_credentials(user, db)
    if not creds:
        return results

    t0 = _time.time()

    def fetch_cal():
        try:
            cal = build("calendar", "v3", credentials=creds)
            now = datetime.now(timezone.utc).isoformat()
            res = cal.events().list(
                calendarId="primary", timeMin=now, maxResults=8, 
                singleEvents=True, orderBy="startTime"
            ).execute()
            return res.get("items", [])
        except Exception: return []

    def fetch_tasks():
        try:
            tasks_svc = build("tasks", "v1", credentials=creds)
            lists = tasks_svc.tasklists().list(maxResults=1).execute()
            items = lists.get("items", [])
            if items:
                res = tasks_svc.tasks().list(tasklist=items[0]["id"], showCompleted=False, maxResults=10).execute()
                return res.get("items", [])
            return []
        except Exception: return []

    def fetch_gmail():
        try:
            gmail = build("gmail", "v1", credentials=creds)
            msgs = gmail.users().messages().list(userId="me", q="is:unread", maxResults=5).execute()
            msg_list = msgs.get("messages", [])
            if not msg_list: return []
            
            subjects = []
            def callback(id, res, exc):
                if not exc:
                    h = {h["name"]: h["value"] for h in res.get("payload", {}).get("headers", [])}
                    subjects.append(f"{h.get('Subject','(no subject)')} [from {h.get('From','?')}]")
            
            batch = gmail.new_batch_http_request(callback=callback)
            for m in msg_list[:5]:
                batch.add(gmail.users().messages().get(userId="me", id=m["id"], format="metadata", metadataHeaders=["Subject", "From"]))
            batch.execute()
            return subjects
        except Exception: return []

    def fetch_con():
        try:
            people = build("people", "v1", credentials=creds)
            people.people().connections().list(resourceName="people/me", pageSize=1, personFields="names").execute()
            return True
        except Exception: return False

    def fetch_sheets():
        try:
            drive = build("drive", "v3", credentials=creds)
            res = drive.files().list(q="mimeType='application/vnd.google-apps.spreadsheet'", pageSize=3, fields="files(name)").execute()
            return [f.get("name") for f in res.get("files", [])]
        except Exception: return []

    with ThreadPoolExecutor(max_workers=5) as ex:
        f_cal = ex.submit(fetch_cal)
        f_tsk = ex.submit(fetch_tasks)
        f_gml = ex.submit(fetch_gmail)
        f_con = ex.submit(fetch_con)
        f_sht = ex.submit(fetch_sheets)
        
        for f in as_completed([f_cal, f_tsk, f_gml, f_con, f_sht], timeout=15):
            pass
            
        results["calendar"] = f_cal.result() if f_cal.done() else []
        results["tasks"] = f_tsk.result() if f_tsk.done() else []
        results["gmail"] = f_gml.result() if f_gml.done() else []
        results["contacts"] = f_con.result() if f_con.done() else False
        results["sheets"] = f_sht.result() if f_sht.done() else []

    print(f"DEBUG: Multi-service fetch for {user.email} took {_time.time()-t0:.1f}s")
    return results


def _format_raw_to_text(raw: dict) -> str:
    """Convert raw JSON data from Google to a human-readable prompt string."""
    parts = []
    
    if raw.get("calendar"):
        lines = []
        for e in raw["calendar"][:5]:
            start = e.get("start", {}).get("dateTime", e.get("start", {}).get("date", ""))
            lines.append(f"- {e.get('summary', 'Untitled')} @ {start}")
        parts.append("UPCOMING CALENDAR EVENTS:\n" + "\n".join(lines))
    
    if raw.get("tasks"):
        lines = [f"- {t.get('title','')}" + (f" (due {t['due'][:10]})" if t.get('due') else "") for t in raw["tasks"][:7]]
        parts.append("PENDING TASKS:\n" + "\n".join(lines))
        
    if raw.get("gmail"):
        lines = [f"- {s}" for s in raw["gmail"]]
        parts.append("RECENT UNREAD EMAILS:\n" + "\n".join(lines))
        
    if raw.get("sheets"):
        parts.append("RECENT GOOGLE SHEETS:\n" + "\n".join([f"- {s}" for s in raw["sheets"]]))

    return "\n\n".join(parts) if parts else "No live Google data available right now."


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

    if not is_authenticated(user, db):
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
        result = {"connected": False, "pending": 0, "has_notes_list": False}
        try:
            tasks_svc = build("tasks", "v1", credentials=creds)
            task_lists = tasks_svc.tasklists().list(maxResults=20).execute()
            tl_items = task_lists.get("items", [])
            result["connected"] = True
            
            # Check if "AI Agent Notes" list exists (Keep workaround)
            for tl in tl_items:
                if tl.get("title") == "AI Agent Notes":
                    result["has_notes_list"] = True
                    break
            
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

    def fetch_contacts():
        result = {"connected": False}
        try:
            people = build("people", "v1", credentials=creds)
            people.people().connections().list(
                resourceName="people/me", pageSize=1, personFields="names"
            ).execute()
            result["connected"] = True
        except Exception as e:
            print(f"DEBUG snapshot contacts error: {e}")
        return result

    def fetch_sheets():
        result = {"connected": False}
        try:
            drive = build("drive", "v3", credentials=creds)
            drive.files().list(
                q="mimeType='application/vnd.google-apps.spreadsheet'",
                pageSize=1, fields="files(id, name)"
            ).execute()
            result["connected"] = True
        except Exception as e:
            print(f"DEBUG snapshot sheets error: {e}")
        return result

    # ── Run all services in parallel ──
    cal_result = {"connected": False, "next_meeting": None, "conflicts": 0}
    tasks_result = {"connected": False, "pending": 0}
    gmail_result = {"connected": False, "unread": 0, "urgent": 0}
    contacts_result = {"connected": False}
    sheets_result = {"connected": False}

    try:
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_cal = executor.submit(fetch_calendar)
            future_tasks = executor.submit(fetch_tasks)
            future_gmail = executor.submit(fetch_gmail)
            future_contacts = executor.submit(fetch_contacts)
            future_sheets = executor.submit(fetch_sheets)

            for future in as_completed([future_cal, future_tasks, future_gmail, future_contacts, future_sheets], timeout=15):
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
            try:
                contacts_result = future_contacts.result(timeout=0)
            except Exception:
                pass
            try:
                sheets_result = future_sheets.result(timeout=0)
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

    if contacts_result["connected"]:
        snapshot["connected_services"].append("Contacts")

    if sheets_result["connected"]:
        snapshot["connected_services"].append("Sheets")

    # Maps is always available (uses free OpenStreetMap + optional Google Maps API for geocoding)
    snapshot["connected_services"].append("Maps")

    print(f"DEBUG snapshot: Parallel fetch completed in {_time.time()-t0:.1f}s — services: {snapshot['connected_services']}")
    return snapshot


async def _get_fresh_user_data(user: User, db: Session, timeout_sec: float = 18.0) -> dict:
    """Get raw data from cache or fetch fresh if TTL expired."""
    import time as _time
    now = _time.time()
    cache = _user_data_cache.get(user.id)
    if cache and (now - cache["timestamp"]) < _CACHE_TTL:
        print(f"DEBUG: Using cached data for user {user.id} ({now - cache['timestamp']:.0f}s old)")
        return cache["data"]

    loop = asyncio.get_event_loop()
    try:
        raw_data = await asyncio.wait_for(
            loop.run_in_executor(None, lambda: _get_raw_data(user, db)),
            timeout=timeout_sec
        )
        _user_data_cache[user.id] = {"data": raw_data, "timestamp": _time.time()}
        return raw_data
    except Exception as e:
        print(f"ERROR: Fetch failed for user {user.id}: {e}")
        return cache["data"] if cache else {}


@router.get("/context-snapshot")
async def get_context_snapshot(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return a structured snapshot for the side panel using the shared cache."""
    raw = await _get_fresh_user_data(current_user, db)
    
    snapshot = {
        "next_meeting": None,
        "unread_emails": len(raw.get("gmail", [])),
        "urgent_emails": 0, # Simplify
        "pending_tasks": len(raw.get("tasks", [])),
        "conflicts_today": 0,
        "connected_services": ["Maps"],
        "authenticated": bool(raw),
    }

    if raw.get("calendar"):
        snapshot["connected_services"].append("Calendar")
        e = raw["calendar"][0]
        start = e.get("start", {}).get("dateTime", e.get("start", {}).get("date", ""))
        snapshot["next_meeting"] = {"title": e.get("summary", "Untitled"), "start": start}
        # Detect simple conflicts in snapshot
        sorted_events = sorted(raw["calendar"], key=lambda dev: dev.get("start", {}).get("dateTime", ""))
        for i in range(len(sorted_events)-1):
            if sorted_events[i].get("end", {}).get("dateTime", "") > sorted_events[i+1].get("start", {}).get("dateTime", ""):
                snapshot["conflicts_today"] += 1

    if raw.get("tasks"): snapshot["connected_services"].append("Tasks")
    if raw.get("gmail"): snapshot["connected_services"].append("Gmail")
    if raw.get("contacts"): snapshot["connected_services"].append("Contacts")
    if raw.get("sheets"): snapshot["connected_services"].append("Sheets")

    return {"status": "success", "snapshot": snapshot}


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
    """Fast AI Chatbot using shared cache."""
    start_time = time.time()
    raw_data = await _get_fresh_user_data(current_user, db)
    context = _format_raw_to_text(raw_data)
    
    context_sources = []
    if raw_data.get("calendar"): context_sources.append("Calendar")
    if raw_data.get("tasks"): context_sources.append("Tasks")
    if raw_data.get("gmail"): context_sources.append("Email")
    if raw_data.get("sheets"): context_sources.append("Sheets")

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
