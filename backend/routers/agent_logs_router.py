"""
Agent Logs Router (PostgreSQL / Neon)

Endpoints:
  POST /api/agent-logs              → Write a per-agent timing/status log
  GET  /api/agent-logs              → List logs for the current user's plans
  GET  /api/agent-logs/plan/{id}    → Logs for a specific plan
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import AgentLog, AIPlan, User
from middleware import get_current_user

router = APIRouter(prefix="/agent-logs", tags=["Agent Logs"])


# ── Schemas ──

class LogCreate(BaseModel):
    plan_id: str          # UUID of parent AIPlan
    agent_name: str
    status: str           # success | error | skipped
    execution_time_ms: Optional[int] = None
    output: Optional[dict] = None
    log_level: Optional[str] = "INFO"


def _log_response(log: AgentLog) -> dict:
    return {
        "id": str(log.id),
        "plan_id": str(log.plan_id),
        "agent_name": log.agent_name,
        "status": log.status,
        "execution_time_ms": log.execution_time_ms,
        "output": log.output,
        "log_level": log.log_level,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


# ── Endpoints ──

@router.post("", status_code=201)
def create_log(
    payload: LogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Write a per-agent execution log entry."""
    # Verify the plan belongs to the current user
    plan = (
        db.query(AIPlan)
        .filter(AIPlan.id == payload.plan_id, AIPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    log = AgentLog(
        plan_id=plan.id,
        agent_name=payload.agent_name,
        status=payload.status,
        execution_time_ms=payload.execution_time_ms,
        output=payload.output,
        log_level=payload.log_level,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _log_response(log)


@router.get("")
def list_logs(
    limit: int = Query(100, ge=1, le=500),
    agent_name: Optional[str] = Query(None, description="Filter by agent name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List recent agent logs across all plans for the current user."""
    user_plan_ids = (
        db.query(AIPlan.id).filter(AIPlan.user_id == current_user.id).scalar_subquery()
    )
    query = db.query(AgentLog).filter(AgentLog.plan_id.in_(user_plan_ids))

    if agent_name:
        query = query.filter(AgentLog.agent_name == agent_name)

    logs = query.order_by(AgentLog.created_at.desc()).limit(limit).all()
    return [_log_response(l) for l in logs]


@router.get("/plan/{plan_id}")
def logs_for_plan(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all agent logs for a specific plan (if owned by user)."""
    plan = (
        db.query(AIPlan)
        .filter(AIPlan.id == plan_id, AIPlan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    logs = (
        db.query(AgentLog)
        .filter(AgentLog.plan_id == plan_id)
        .order_by(AgentLog.created_at.asc())
        .all()
    )
    return [_log_response(l) for l in logs]
