from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import json

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

load_dotenv()

app = FastAPI(title="AI Personal Task Automation System - Multi-Agent")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
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
        "endpoints": {
            "auth": "/api/auth/google",
            "calendar": "/api/calendar/events",
            "emails": "/api/email/inbox",
            "maps": "/api/maps/directions",
            "tasks": "/api/tasks/list",
            "planner": "/api/plan-day-live"
        }
    }
