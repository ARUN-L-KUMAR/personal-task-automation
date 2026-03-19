from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import json
import os

# ── Load .env BEFORE any router imports so os.getenv() reads the correct values ──
load_dotenv()

from sqlalchemy.exc import IntegrityError, OperationalError

from graph.agent_graph import ScheduleAgentGraph
from routers.auth_router import router as auth_router
from routers.calendar_router import router as calendar_router
from routers.email_router import router as email_router
from routers.maps_router import router as maps_router
from routers.contacts_router import router as contacts_router
from routers.tasks_router import router as tasks_router
from routers.planner_router import router as planner_router
from routers.sheets_router import router as sheets_router
from routers.chatbot_router import router as chatbot_router
from routers.dashboard_router import router as dashboard_router

# ── Neon PostgreSQL routers ──
from routers.db_auth_router import router as db_auth_router
from routers.projects_router import router as projects_router
from routers.db_tasks_router import router as db_tasks_router
from routers.chat_history_router import router as chat_history_router
from routers.voice_router import router as voice_router

# ── New DB routers ──
from routers.ai_plans_router import router as ai_plans_router
from routers.settings_router import router as settings_router
from routers.metrics_router import router as metrics_router
from routers.agent_logs_router import router as agent_logs_router
from routers.meetings_router import router as meetings_router
from routers.notes_router import router as notes_router
from routers.notifications_router import router as notifications_router

# ── Error handlers ──
from middleware.error_handlers import (
    global_exception_handler,
    integrity_error_handler,
    db_connection_error_handler,
)

app = FastAPI(title="AI Personal Task Automation System - Multi-Agent")

# --- Global Error Handlers ---
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, db_connection_error_handler)
app.add_exception_handler(Exception, global_exception_handler)

# --- CORS Middleware ---
_default_dev_origins = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
}
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_env_origins = {
    o.strip().rstrip("/")
    for o in _raw_origins.split(",")
    if o.strip()
}
_allowed_origins = sorted(_default_dev_origins | _env_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register API Routers ---
app.include_router(auth_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")
app.include_router(email_router, prefix="/api")
app.include_router(maps_router, prefix="/api")
app.include_router(contacts_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(planner_router, prefix="/api")
app.include_router(sheets_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

# ── Neon PostgreSQL CRUD routers ──
app.include_router(db_auth_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(db_tasks_router, prefix="/api")
app.include_router(chat_history_router, prefix="/api")
app.include_router(voice_router, prefix="/api")

# ── New DB-backed routers ──
app.include_router(ai_plans_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(agent_logs_router, prefix="/api")
app.include_router(meetings_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")

# Initialize the unified agent graph (supports manual + live modes)
agent_graph = ScheduleAgentGraph()


class Meeting(BaseModel):
    title: str
    time: str
    location: str


class Task(BaseModel):
    title: str
    deadline: str


class ScheduleInput(BaseModel):
    meetings: List[Meeting]
    tasks: List[Task]


@app.get("/")
def read_root():
    return {
        "message": "Personal Task Automation Backend is Running 🚀",
        "architecture": "LangGraph Multi-Agent System",
        "database": "Neon PostgreSQL (SQLAlchemy)",
        "endpoints": {
            "auth": "/api/auth/google",
            "db_auth": "/api/db-auth/register | /api/db-auth/login",
            "calendar": "/api/calendar/events",
            "emails": "/api/email/inbox",
            "maps": "/api/maps/directions",
            "tasks": "/api/tasks/list",
            "projects": "/api/projects",
            "db_tasks": "/api/db-tasks",
            "planner": "/api/plan-day-live",
            "docs": "/docs",
        }
    }
