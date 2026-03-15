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
from database.models import ProductivityMetric, User
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
    return [_metric_response(m) for m in metrics]


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
    if not metric:
        return {
            "id": None,
            "date": None,
            "tasks_completed": 0,
            "meetings_count": 0,
            "travel_minutes": 0,
            "productivity_score": None,
        }
    return _metric_response(metric)
