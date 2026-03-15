"""
Multi-Agent System for Personal Task Automation

10 unified agents — each supports both manual input AND Google auto-fetch:

Core agents (dual-mode: manual + Google):
- CalendarAgent:  analyze(meetings) | fetch_and_analyze() via Google Calendar
- TaskAgent:      analyze(tasks)    | fetch_and_analyze() via Google Tasks
- TravelAgent:    plan(meetings)    | analyze_travel()    via Google Maps
- EmailAgent:     analyze(emails)   | fetch_and_analyze() via Gmail
- ContactsAgent:  analyze(contacts) | fetch_and_analyze() via Google Contacts
- SheetsAgent:    analyze(data)     | fetch_and_analyze() via Google Sheets
- NotesAgent:     analyze(events)   | fetch_and_analyze() via Google Tasks/Notes

Analysis agents (work on any data from above):
- ConflictAgent:   Detects scheduling conflicts
- PlanningAgent:   Creates optimized daily schedule
- CoordinatorAgent: Synthesizes final user-friendly response
"""

from .calendar_agent import CalendarAgent
from .task_agent import TaskAgent
from .travel_agent import TravelAgent
from .email_agent import EmailAgent
from .contacts_agent import ContactsAgent
from .sheets_agent import SheetsAgent
from .notes_agent import NotesAgent
from .conflict_agent import ConflictAgent
from .planning_agent import PlanningAgent
from .coordinator import CoordinatorAgent

__all__ = [
    'CalendarAgent',
    'TaskAgent',
    'TravelAgent',
    'EmailAgent',
    'ContactsAgent',
    'SheetsAgent',
    'NotesAgent',
    'ConflictAgent',
    'PlanningAgent',
    'CoordinatorAgent',
]
