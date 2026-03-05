"""
Google Calendar API Router

Endpoints:
- GET  /api/calendar/events       → Fetch today's events
- GET  /api/calendar/events/range → Fetch events in date range
- POST /api/calendar/events       → Create a new event
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from utils.google_auth import is_authenticated
from utils.google_calendar import get_today_events, get_events, create_event
from database.connection import get_db
from database.models import User
from middleware import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/events")
def fetch_today_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch today's calendar events for the current user."""
    if not is_authenticated(current_user):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        events = get_today_events(current_user, db)
        return {"status": "success", "events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/range")
def fetch_events_range(
    start: Optional[str] = Query(None, description="ISO start date"),
    end: Optional[str] = Query(None, description="ISO end date"),
    max_results: int = Query(20, description="Max events to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch events in a date range for the current user."""
    if not is_authenticated(current_user):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        events = get_events(current_user, db, start_date=start, end_date=end, max_results=max_results)
        return {"status": "success", "events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateEventRequest(BaseModel):
    summary: str
    start_time: str
    end_time: str
    location: str = ""
    description: str = ""


@router.post("/events")
def create_calendar_event(
    event: CreateEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new calendar event for the current user."""
    if not is_authenticated(current_user):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        result = create_event(
            current_user, db,
            summary=event.summary,
            start_time=event.start_time,
            end_time=event.end_time,
            location=event.location,
            description=event.description
        )
        return {"status": "success", "event": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
