"""
AI Plans CRUD Router (PostgreSQL / Neon)

Endpoints:
  POST   /api/ai-plans           → Save a new plan after generation
  GET    /api/ai-plans           → List plans for current user (history)
  GET    /api/ai-plans/{id}      → Retrieve a single plan by ID
  DELETE /api/ai-plans/{id}      → Delete a plan
"""

from uuid import UUID
from datetime import date as date_type, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import AIPlan, AgentLog, User
from middleware import get_current_user

router = APIRouter(prefix="/ai-plans", tags=["AI Plans"])


# ── Schemas ──

class PlanCreate(BaseModel):
    plan_date: str  # ISO date string
    optimized_schedule: Optional[dict] = None
    conflicts: Optional[dict] = None
    travel_plan: Optional[dict] = None
    productivity_score: Optional[int] = None
    overload_risk: Optional[str] = None
    execution_time_ms: Optional[int] = None
    model_used: Optional[str] = None
    optimization_mode: Optional[str] = "balanced"


# ── Helpers ──

def _plan_response(plan: AIPlan) -> dict:
    logs = [
        {
            "id": str(log.id),
            "agent_name": log.agent_name,
            "status": log.status,
            "execution_time_ms": log.execution_time_ms,
            "log_level": log.log_level,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in (plan.agent_logs or [])
    ]
    return {
        "id": str(plan.id),
        "plan_date": str(plan.plan_date) if plan.plan_date else None,
        "optimized_schedule": plan.optimized_schedule,
        "conflicts": plan.conflicts,
        "travel_plan": plan.travel_plan,
        "productivity_score": plan.productivity_score,
        "overload_risk": plan.overload_risk,
        "execution_time_ms": plan.execution_time_ms,
        "model_used": plan.model_used,
        "optimization_mode": plan.optimization_mode,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "agent_logs": logs,
    }


# ── Endpoints ──

@router.post("", status_code=201)
def create_plan(
    payload: PlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a new AI-generated plan."""
    plan = AIPlan(
        user_id=current_user.id,
        plan_date=date_type.fromisoformat(payload.plan_date),
        optimized_schedule=payload.optimized_schedule,
        conflicts=payload.conflicts,
        travel_plan=payload.travel_plan,
        productivity_score=payload.productivity_score,
        overload_risk=payload.overload_risk,
        execution_time_ms=payload.execution_time_ms,
        model_used=payload.model_used,
        optimization_mode=payload.optimization_mode,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_response(plan)


@router.get("")
def list_plans(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all plans for the current user, newest first."""
    plans = (
        db.query(AIPlan)
        .filter(AIPlan.user_id == current_user.id)
        .order_by(AIPlan.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_plan_response(p) for p in plans]


@router.get("/{plan_id}")
def get_plan(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single plan with its agent logs."""
    plan = (
        db.query(AIPlan)
        .filter(AIPlan.id == plan_id, AIPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return _plan_response(plan)


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a plan and its associated agent logs."""
    plan = (
        db.query(AIPlan)
        .filter(AIPlan.id == plan_id, AIPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    db.delete(plan)
    db.commit()
    return {"status": "deleted", "id": str(plan_id)}
