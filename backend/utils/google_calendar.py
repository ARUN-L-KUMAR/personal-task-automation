"""
Google Calendar API Utility

Functions:
- get_today_events()  → Fetch today's calendar events
- get_events(start, end) → Fetch events in a date range
- create_event(summary, start, end, location) → Create a new event
"""

from datetime import datetime, timedelta
from googleapiclient.discovery import build
from utils.google_auth import get_credentials


def _get_service():
    """Build Google Calendar service."""
    creds = get_credentials()
    if not creds:
        raise Exception("Google not authenticated. Please connect Google account first.")
    return build("calendar", "v3", credentials=creds)


def get_today_events():
    """Fetch today's events from primary calendar."""
    service = _get_service()
    
    now = datetime.utcnow()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
    end_of_day = (now.replace(hour=23, minute=59, second=59, microsecond=0)).isoformat() + "Z"
    
    events_result = service.events().list(
        calendarId="primary",
        timeMin=start_of_day,
        timeMax=end_of_day,
        singleEvents=True,
        orderBy="startTime"
    ).execute()
    
    events = events_result.get("items", [])
    
    return [
        {
            "id": event.get("id"),
            "title": event.get("summary", "No Title"),
            "start": event.get("start", {}).get("dateTime", event.get("start", {}).get("date", "")),
            "end": event.get("end", {}).get("dateTime", event.get("end", {}).get("date", "")),
            "location": event.get("location", "No location"),
            "description": event.get("description", ""),
            "attendees": [
                a.get("email", "") for a in event.get("attendees", [])
            ],
            "status": event.get("status", "confirmed"),
            "link": event.get("htmlLink", ""),
        }
        for event in events
    ]


def get_events(start_date: str = None, end_date: str = None, max_results: int = 20):
    """
    Fetch events in a date range.
    
    Args:
        start_date: ISO format start date (default: now)
        end_date: ISO format end date (default: 7 days from now)
        max_results: Maximum number of events to return
    """
    service = _get_service()
    
    if not start_date:
        start_date = datetime.utcnow().isoformat() + "Z"
    if not end_date:
        end_date = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
    
    events_result = service.events().list(
        calendarId="primary",
        timeMin=start_date,
        timeMax=end_date,
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime"
    ).execute()
    
    events = events_result.get("items", [])
    
    return [
        {
            "id": event.get("id"),
            "title": event.get("summary", "No Title"),
            "start": event.get("start", {}).get("dateTime", event.get("start", {}).get("date", "")),
            "end": event.get("end", {}).get("dateTime", event.get("end", {}).get("date", "")),
            "location": event.get("location", "No location"),
            "description": event.get("description", ""),
            "attendees": [a.get("email", "") for a in event.get("attendees", [])],
        }
        for event in events
    ]


def create_event(summary: str, start_time: str, end_time: str, 
                 location: str = "", description: str = ""):
    """
    Create a new calendar event.
    
    Args:
        summary: Event title
        start_time: ISO format start time
        end_time: ISO format end time
        location: Event location
        description: Event description
    """
    service = _get_service()
    
    event = {
        "summary": summary,
        "location": location,
        "description": description,
        "start": {"dateTime": start_time, "timeZone": "Asia/Kolkata"},
        "end": {"dateTime": end_time, "timeZone": "Asia/Kolkata"},
    }
    
    created = service.events().insert(
        calendarId="primary", body=event
    ).execute()
    
    return {
        "id": created.get("id"),
        "title": created.get("summary"),
        "link": created.get("htmlLink"),
        "status": "created"
    }
