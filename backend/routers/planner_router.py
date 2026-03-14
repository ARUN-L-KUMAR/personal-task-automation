"""
Planner API Router (Multi-User Version)

Endpoints:
- POST /api/plan-day-live → Plan day using REAL Google data (auto-fetches everything)
"""

import time
from datetime import datetime, timezone, date as date_type
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

from utils.google_auth import is_authenticated
from graph.agent_graph import ScheduleAgentGraph
from database.connection import get_db
from database.models import User, AIPlan
from middleware import get_current_user

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
def plan_day_live(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Plan the user's day using REAL Google data.
    
    This endpoint triggers the full 10-agent pipeline:
    1. Fetches Calendar, Tasks, Emails, Contacts from Google
    2. Gets real directions from Google Maps
    3. Detects conflicts and creates optimized plan
    4. Generates notes and final AI summary
    
    No input needed — all data is fetched from connected Google services.
    """
    if not is_authenticated(current_user, db):
        raise HTTPException(
            status_code=401,
            detail="Google not connected. Please connect Google account in Settings."
        )
    
    try:
        graph = ScheduleAgentGraph()
        t0 = time.time()
        result = graph.execute_live(current_user, db)
        elapsed_ms = int((time.time() - t0) * 1000)

        # ── Persist to ai_plans ──
        plan = AIPlan(
            user_id=current_user.id,
            plan_date=date_type.today(),
            optimized_schedule=result.get("optimized_plan"),
            conflicts=result.get("conflicts"),
            travel_plan=result.get("travel_plan"),
            model_used="llama-3.3-70b-versatile",
            execution_time_ms=elapsed_ms,
            optimization_mode="balanced",
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        
        return {
            "status": "success",
            "plan_id": str(plan.id),
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
def plan_day_manual(
    data: PlannerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manual planning using provided meetings and tasks."""
    try:
        graph = ScheduleAgentGraph()
        
        # Convert Pydantic → dicts for the graph
        meetings_list = [m.dict() for m in data.meetings]
        tasks_list = [t.dict() for t in data.tasks]
        
        t0 = time.time()
        result = graph.execute(meetings_list, tasks_list)
        elapsed_ms = int((time.time() - t0) * 1000)

        # ── Persist to ai_plans ──
        plan = AIPlan(
            user_id=current_user.id,
            plan_date=date_type.fromisoformat(data.date) if data.date else date_type.today(),
            optimized_schedule=result.get("optimized_plan"),
            conflicts=result.get("conflicts"),
            travel_plan=result.get("travel_plan"),
            model_used="llama-3.3-70b-versatile",
            execution_time_ms=elapsed_ms,
            optimization_mode="balanced",
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

        return {
            "status": "success",
            "plan_id": str(plan.id),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "conflict_analysis": result.get("conflicts", "No conflicts detected."),
            "travel_reminders": result.get("travel_plan", "No travel needed."),
            "ai_explanation": result.get("final_response", "Optimization complete."),
            "rule_based_plan": result.get("optimized_plan", "Daily plan generated.")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/last-output")
def get_last_output(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the most recently generated plan for the current user."""

    plan = (
        db.query(AIPlan)
        .filter(AIPlan.user_id == current_user.id)
        .order_by(AIPlan.created_at.desc())
        .first()
    )
    if not plan:
        return {
            "id": None,
            "input": {"date": None, "meetings": [], "tasks": []},
            "output": {
                "generated_at": None,
                "conflict_analysis": "No conflicts detected.",
                "travel_reminders": "No travel needed.",
                "ai_explanation": "No plan generated yet.",
                "rule_based_plan": "No plan generated yet."
            },
            "status": "empty",
            "timestamp": None
        }
    return _plan_to_dict(plan)


# ── Helper ──

def _plan_to_dict(plan) -> dict:
    return {
        "id": str(plan.id),
        "input": {
            "date": str(plan.plan_date) if plan.plan_date else None,
            "meetings": [],
            "tasks": [],
        },
        "output": {
            "generated_at": plan.created_at.isoformat() if plan.created_at else None,
            "conflict_analysis": plan.conflicts or "No conflicts detected.",
            "travel_reminders": plan.travel_plan or "No travel needed.",
            "ai_explanation": plan.optimization_mode or "Optimization complete.",
            "rule_based_plan": plan.optimized_schedule or "No plan generated yet.",
            "productivity_score": plan.productivity_score,
            "overload_risk": plan.overload_risk,
            "model_used": plan.model_used,
        },
        "status": "success",
        "timestamp": plan.created_at.isoformat() if plan.created_at else None,
    }
