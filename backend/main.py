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
app.include_router(auth_router)
app.include_router(calendar_router)
app.include_router(email_router)
app.include_router(maps_router)
app.include_router(contacts_router)
app.include_router(tasks_router)
app.include_router(planner_router)
app.include_router(sheets_router)

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
        "agents": [
            "CalendarAgent (Google Calendar + Manual)",
            "TaskAgent (Google Tasks + Manual)",
            "TravelAgent (Google Maps + Manual)",
            "EmailAgent (Gmail + Manual)",
            "ContactsAgent (Google Contacts + Manual)",
            "SheetsAgent (Google Sheets + Manual)",
            "NotesAgent (Google Notes + Manual)",
            "ConflictAgent",
            "PlanningAgent",
            "CoordinatorAgent"
        ],
        "total_agents": 10,
        "modes": {
            "manual": "POST /plan-day → User provides meetings + tasks",
            "live": "POST /api/plan-day-live → Auto-fetches from Google"
        },
        "google_services": [
            "Google Calendar", "Gmail", "Google Maps",
            "Google Contacts", "Google Sheets",
            "Google Tasks", "Google Notes (via Tasks)"
        ],
        "endpoints": {
            "auth": "/api/auth/google",
            "calendar": "/api/calendar/events",
            "emails": "/api/emails/inbox",
            "maps": "/api/maps/directions",
            "contacts": "/api/contacts",
            "tasks": "/api/tasks",
            "notes": "/api/notes",
            "sheets": "/api/sheets/{spreadsheet_id}",
            "plan_manual": "/plan-day",
            "plan_live": "/api/plan-day-live"
        }
    }


@app.post("/plan-day")
def analyze_schedule(data: ScheduleInput):
    """
    Multi-agent schedule analysis using LangGraph workflow (manual input).
    
    The system uses a graph-based multi-agent architecture where:
    1. CalendarAgent analyzes meetings
    2. TaskAgent analyzes tasks
    3. ConflictAgent detects scheduling conflicts
    4. TravelAgent plans travel logistics
    5. PlanningAgent creates optimized schedule
    6. CoordinatorAgent synthesizes final response
    """
    # Convert Pydantic → dict
    meetings_list = [m.dict() for m in data.meetings]
    tasks_list = [t.dict() for t in data.tasks]

    # Execute the multi-agent graph workflow
    result = agent_graph.execute(meetings_list, tasks_list)

    return {
        "status": "success",
        "calendar_analysis": result["calendar_analysis"],
        "task_analysis": result["task_analysis"],
        "conflict_analysis": result["conflicts"],
        "travel_plan": result["travel_plan"],
        "optimized_plan": result["optimized_plan"],
        "final_response": result["final_response"],
        "metadata": {
            "architecture": "Multi-Agent Graph",
            "agents_used": 6,
            "workflow": "Sequential AI Pipeline"
        }
    }
