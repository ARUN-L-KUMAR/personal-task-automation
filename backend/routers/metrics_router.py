"""
Productivity Metrics Router (PostgreSQL / Neon)

Endpoints:
  POST /api/metrics              → Write / upsert a daily score
  GET  /api/metrics              → List metrics (for Insights charts)
  GET  /api/metrics/latest       → Latest single metric
"""

from uuid import UUID
from datetime import date as date_type, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database.connection import get_db
from database.models import ProductivityMetric, AIPlan, User
from middleware import get_current_user

router = APIRouter(prefix="/metrics", tags=["Productivity Metrics"])


# ── Schemas ──

class MetricUpsert(BaseModel):
    date: str  # ISO date
    tasks_completed: Optional[int] = 0
    meetings_count: Optional[int] = 0
    travel_minutes: Optional[int] = 0
    productivity_score: Optional[int] = None


def _metric_response(m: ProductivityMetric) -> dict:
    return {
        "id": str(m.id),
        "date": str(m.date),
        "tasks_completed": m.tasks_completed,
        "meetings_count": m.meetings_count,
        "travel_minutes": m.travel_minutes,
        "productivity_score": m.productivity_score,
    }


def _extract_schedule_entries(optimized_schedule) -> list:
    """Normalize schedule entries from stored AI plan JSON shapes."""
    if not optimized_schedule:
        return []

    if isinstance(optimized_schedule, list):
        return optimized_schedule

    if isinstance(optimized_schedule, dict):
        if isinstance(optimized_schedule.get("optimized_schedule"), list):
            return optimized_schedule["optimized_schedule"]
        if isinstance(optimized_schedule.get("schedule"), list):
            return optimized_schedule["schedule"]

    return []


def _extract_travel_minutes(travel_plan) -> int:
    """Extract total travel minutes from different JSON formats."""
    if not isinstance(travel_plan, dict):
        return 0

    direct = travel_plan.get("totalMinutes")
    if isinstance(direct, (int, float)):
        return int(direct)

    snake = travel_plan.get("total_minutes")
    if isinstance(snake, (int, float)):
        return int(snake)

    routes = travel_plan.get("routes", [])
    total = 0
    if isinstance(routes, list):
        for route in routes:
            if isinstance(route, dict):
                mins = route.get("minutes")
                if isinstance(mins, (int, float)):
                    total += int(mins)
    return total


def _ai_plan_metric_response(plan: AIPlan) -> dict:
    """Convert an AIPlan row to the metric response shape used by insights."""
    schedule = _extract_schedule_entries(plan.optimized_schedule)
    meetings_count = sum(1 for e in schedule if isinstance(e, dict) and str(e.get("type", "")).lower() == "meeting")
    tasks_count = sum(1 for e in schedule if isinstance(e, dict) and str(e.get("type", "")).lower() == "task")
    travel_minutes = _extract_travel_minutes(plan.travel_plan)

    return {
        "id": str(plan.id),
        "date": str(plan.plan_date),
        "tasks_completed": tasks_count,
        "meetings_count": meetings_count,
        "travel_minutes": travel_minutes,
        "productivity_score": plan.productivity_score,
    }


# ── Endpoints ──

@router.post("")
def upsert_metric(
    payload: MetricUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Write or update a daily productivity metric for the current user."""
    target_date = date_type.fromisoformat(payload.date)

    metric = (
        db.query(ProductivityMetric)
        .filter(
            and_(
                ProductivityMetric.user_id == current_user.id,
                ProductivityMetric.date == target_date,
            )
        )
        .first()
    )

    if not metric:
        metric = ProductivityMetric(
            user_id=current_user.id,
            date=target_date,
        )
        db.add(metric)

    metric.tasks_completed = payload.tasks_completed
    metric.meetings_count = payload.meetings_count
    metric.travel_minutes = payload.travel_minutes
    metric.productivity_score = payload.productivity_score

    db.commit()
    db.refresh(metric)
    return _metric_response(metric)


@router.get("")
def list_metrics(
    days: int = Query(30, ge=1, le=365, description="Number of past days to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return daily metrics for the Insights page charts."""
    from datetime import timedelta

    cutoff = date_type.today() - timedelta(days=days)
    metrics = (
        db.query(ProductivityMetric)
        .filter(
            ProductivityMetric.user_id == current_user.id,
            ProductivityMetric.date >= cutoff,
        )
        .order_by(ProductivityMetric.date.asc())
        .all()
    )

    if metrics:
        return [_metric_response(m) for m in metrics]

    # Fallback for users where metrics table is not populated yet:
    # derive chart data from saved AI plans (real plan output).
    plans = (
        db.query(AIPlan)
        .filter(
            AIPlan.user_id == current_user.id,
            AIPlan.plan_date >= cutoff,
        )
        .order_by(AIPlan.plan_date.asc(), AIPlan.created_at.asc())
        .all()
    )

    return [_ai_plan_metric_response(p) for p in plans]


@router.get("/latest")
def get_latest_metric(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the most recent metric for the current user."""
    metric = (
        db.query(ProductivityMetric)
        .filter(ProductivityMetric.user_id == current_user.id)
        .order_by(ProductivityMetric.date.desc())
        .first()
    )

    if metric:
        return _metric_response(metric)

    latest_plan = (
        db.query(AIPlan)
        .filter(AIPlan.user_id == current_user.id)
        .order_by(AIPlan.plan_date.desc(), AIPlan.created_at.desc())
        .first()
    )

    if latest_plan:
        return _ai_plan_metric_response(latest_plan)

    return {
        "id": None,
        "date": None,
        "tasks_completed": 0,
        "meetings_count": 0,
        "travel_minutes": 0,
        "productivity_score": None,
    }
