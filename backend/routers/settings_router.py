"""
User Settings Router (PostgreSQL / Neon)

Endpoints:
  GET  /api/settings   → Get current user's settings
  PUT  /api/settings   → Create or update settings (upsert)
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import UserSettings, User
from middleware import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


# ── Schemas ──

class SettingsUpdate(BaseModel):
    timezone: Optional[str] = None
    work_start: Optional[str] = None   # "HH:MM"
    work_end: Optional[str] = None     # "HH:MM"
    productivity_mode: Optional[str] = None  # balanced | aggressive | relaxed
    preferences: Optional[Dict[str, Any]] = None  # notification toggles, general prefs, etc.


def _settings_response(s: UserSettings) -> dict:
    return {
        "id": str(s.id),
        "timezone": s.timezone,
        "work_start": s.work_start.strftime("%H:%M") if s.work_start else None,
        "work_end": s.work_end.strftime("%H:%M") if s.work_end else None,
        "productivity_mode": s.productivity_mode,
        "preferences": s.preferences or {},
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


# ── Endpoints ──

@router.get("")
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's settings (or sensible defaults)."""
    settings = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == current_user.id)
        .first()
    )
    if not settings:
        return {
            "id": None,
            "timezone": "UTC",
            "work_start": "09:00",
            "work_end": "18:00",
            "productivity_mode": "balanced",
            "preferences": {},
            "created_at": None,
        }
    return _settings_response(settings)


@router.put("")
def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update the current user's settings."""
    from datetime import time as time_type

    settings = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == current_user.id)
        .first()
    )

    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    if payload.timezone is not None:
        settings.timezone = payload.timezone
    if payload.work_start is not None:
        h, m = payload.work_start.split(":")
        settings.work_start = time_type(int(h), int(m))
    if payload.work_end is not None:
        h, m = payload.work_end.split(":")
        settings.work_end = time_type(int(h), int(m))
    if payload.productivity_mode is not None:
        settings.productivity_mode = payload.productivity_mode
    if payload.preferences is not None:
        # Merge incoming prefs with existing ones so partial updates work
        existing = settings.preferences or {}
        existing.update(payload.preferences)
        settings.preferences = existing

    db.commit()
    db.refresh(settings)
    return _settings_response(settings)
