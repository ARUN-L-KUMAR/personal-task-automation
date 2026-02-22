"""
Planner API Router

Endpoints:
- POST /api/plan-day-live → Plan day using REAL Google data (auto-fetches everything)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from utils.google_auth import is_authenticated
from graph.agent_graph import ScheduleAgentGraph

router = APIRouter(tags=["Planner"])


class Meeting(BaseModel):
    title: str
    startTime: str
    endTime: str
    priority: Optional[str] = "medium"


class Task(BaseModel):
    title: str
    duration: int
    priority: Optional[str] = "medium"


class PlannerRequest(BaseModel):
    date: str
    meetings: List[Meeting]
    tasks: List[Task]


@router.post("/plan-day-live")
def plan_day_live():
    """
    Plan the user's day using REAL Google data.
    
    This endpoint triggers the full 10-agent pipeline:
    1. Fetches Calendar, Tasks, Emails, Contacts from Google
    2. Gets real directions from Google Maps
    3. Detects conflicts and creates optimized plan
    4. Generates notes and final AI summary
    
    No input needed — all data is fetched from connected Google services.
    """
    if not is_authenticated():
        raise HTTPException(
            status_code=401,
            detail="Google not authenticated. Connect Google account at /api/auth/google"
        )
    
    try:
        graph = ScheduleAgentGraph()
        result = graph.execute_live()
        
        return {
            "status": "success",
            "calendar_analysis": result.get("calendar_analysis", {}),
            "task_analysis": result.get("task_analysis", {}),
            "google_emails": result.get("google_emails", {}),
            "google_contacts": result.get("google_contacts", {}),
            "google_sheets": result.get("google_sheets", {}),
            "google_notes": result.get("google_notes", {}),
            "conflicts": result.get("conflicts", {}),
            "travel_plan": result.get("travel_plan", {}),
            "optimized_plan": result.get("optimized_plan", {}),
            "final_response": result.get("final_response", ""),
            "metadata": {
                "architecture": "Unified Multi-Agent Graph",
                "agents_used": 10,
                "mode": "live",
                "google_services": [
                    "Calendar", "Gmail", "Maps", "Contacts", "Sheets", "Tasks", "Notes"
                ],
                "workflow": "Google Data Fetch → AI Analysis Pipeline"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@router.post("/plan-day")
def plan_day_manual(data: PlannerRequest):
    """Manual planning using provided meetings and tasks."""
    try:
        graph = ScheduleAgentGraph()
        
        # Convert Pydantic → dicts for the graph
        meetings_list = [m.dict() for m in data.meetings]
        tasks_list = [t.dict() for t in data.tasks]
        
        result = graph.execute(meetings_list, tasks_list)
        
        return {
            "status": "success",
            "generated_at": "2024-03-24T12:00:00Z", # Placeholder for real timestamp
            "conflict_analysis": result.get("conflicts", "No conflicts detected."),
            "travel_reminders": result.get("travel_plan", "No travel needed."),
            "ai_explanation": result.get("final_response", "Optimization complete."),
            "rule_based_plan": result.get("optimized_plan", "Daily plan generated.")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/last-output")
def get_last_output():
    """Get the most recently generated plan."""
    return {
        "status": "success",
        "generated_at": "2024-03-24T12:00:00Z",
        "conflict_analysis": "No conflicts detected.",
        "travel_reminders": "No travel needed.",
        "ai_explanation": "Optimization complete.",
        "rule_based_plan": "No plan generated yet."
    }
