"""
Meetings Router (PostgreSQL / Neon)

Endpoints:
  POST /api/meetings/sync   → Pull today's Google Calendar events into the meetings table
  GET  /api/meetings         → List locally-stored meetings for the current user
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, cast, Date

from database.connection import get_db
from database.models import Meeting, User
from utils.google_auth import is_authenticated
from utils.google_calendar import get_today_events
from middleware import get_current_user

router = APIRouter(prefix="/meetings", tags=["Meetings"])


def _meeting_response(m: Meeting) -> dict:
    return {
        "id": str(m.id),
        "title": m.title,
        "start_time": m.start_time.isoformat() if m.start_time else None,
        "end_time": m.end_time.isoformat() if m.end_time else None,
        "location": m.location,
        "attendees": m.attendees,
        "source": m.source,
        "last_synced_at": m.last_synced_at.isoformat() if m.last_synced_at else None,
    }


@router.post("/sync")
def sync_today_meetings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Pull today's events from Google Calendar and upsert them into the
    local meetings table.  Existing rows for today are replaced so the
    table always mirrors the calendar.
    """
    if not is_authenticated(current_user, db):
        raise HTTPException(
            status_code=401,
            detail="Google not connected. Please connect Google account in Settings.",
        )

    try:
        events = get_today_events(current_user, db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Calendar fetch failed: {e}")

    now = datetime.now(timezone.utc)
    today = now.date()

    # Delete today's previously-synced meetings for this user
    db.query(Meeting).filter(
        and_(
            Meeting.user_id == current_user.id,
            Meeting.source == "google",
            cast(Meeting.start_time, Date) == today,
        )
    ).delete(synchronize_session="fetch")

    synced = []
    for ev in events:
        start_str = ev.get("start")
        end_str = ev.get("end")
        start_time = _parse_dt(start_str) if start_str else now
        end_time = _parse_dt(end_str) if end_str else None

        meeting = Meeting(
            user_id=current_user.id,
            title=ev.get("title", "Untitled"),
            start_time=start_time,
            end_time=end_time,
            location=ev.get("location"),
            attendees=ev.get("attendees"),
            source="google",
            last_synced_at=now,
        )
        db.add(meeting)
        synced.append(meeting)

    db.commit()
    for m in synced:
        db.refresh(m)

    return {
        "status": "success",
        "synced_count": len(synced),
        "meetings": [_meeting_response(m) for m in synced],
    }


@router.get("")
def list_meetings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all locally-stored meetings for the current user."""
    meetings = (
        db.query(Meeting)
        .filter(Meeting.user_id == current_user.id)
        .order_by(Meeting.start_time.desc())
        .limit(100)
        .all()
    )
    return [_meeting_response(m) for m in meetings]


# ── Helpers ──

def _parse_dt(value: str) -> datetime:
    """Best-effort ISO datetime parse (handles date-only too)."""
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.fromisoformat(value + "T00:00:00+00:00")
