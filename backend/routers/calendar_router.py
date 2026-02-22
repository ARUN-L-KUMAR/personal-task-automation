"""
Google Calendar API Router

Endpoints:
- GET  /api/calendar/events       → Fetch today's events
- GET  /api/calendar/events/range → Fetch events in date range
- POST /api/calendar/events       → Create a new event
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from utils.google_auth import is_authenticated
from utils.google_calendar import get_today_events, get_events, create_event

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


def _check_auth():
    if not is_authenticated():
        raise HTTPException(status_code=401, detail="Google not authenticated. Please connect Google account.")


@router.get("/events")
def fetch_today_events():
    """Fetch today's calendar events."""
    _check_auth()
    try:
        events = get_today_events()
        return {"status": "success", "events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/range")
def fetch_events_range(
    start: Optional[str] = Query(None, description="ISO start date"),
    end: Optional[str] = Query(None, description="ISO end date"),
    max_results: int = Query(20, description="Max events to return")
):
    """Fetch events in a date range."""
    _check_auth()
    try:
        events = get_events(start_date=start, end_date=end, max_results=max_results)
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
def create_calendar_event(event: CreateEventRequest):
    """Create a new calendar event."""
    _check_auth()
    try:
        result = create_event(
            summary=event.summary,
            start_time=event.start_time,
            end_time=event.end_time,
            location=event.location,
            description=event.description
        )
        return {"status": "success", "event": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
