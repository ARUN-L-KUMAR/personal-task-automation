"""
Multi-Agent System for Personal Task Automation

11 agents — each purpose-built for a specific role in the planning pipeline:

Data Fetch agents (dual-mode: manual input OR Google auto-fetch):
- CalendarAgent:          analyze(meetings)  | fetch_and_analyze()  via Google Calendar
- TaskAgent:              analyze(tasks)     | fetch_and_analyze()  via Google Tasks
- TravelAgent:            plan(meetings)     | analyze_travel()     via Google Maps
- EmailAgent:             analyze(emails)    | fetch_and_analyze()  via Gmail
- ContactsAgent:          analyze(contacts)  | fetch_and_analyze()  via Google Contacts
- SheetsAgent:            analyze(data)      | fetch_and_analyze()  via Google Sheets
- NotesAgent:             analyze(events)    | fetch_and_analyze()  via Google Tasks/Notes

Reasoning agents (ReAct tool-use — iterative LLM + tools loop):
- ConflictAgent:          ReAct with check_time_overlap + estimate_buffer_needed tools
- PlanningAgent:          ReAct with find_free_slots + score_task_priority tools

Conditional agent (only reached via add_conditional_edges when high-severity conflicts exist):
- ConflictResolutionAgent: Proposes concrete resolutions: reschedule / delegate / drop / compress

Synthesis agent:
- CoordinatorAgent:        Synthesizes all outputs into a final user-friendly response
"""

from .calendar_agent    import CalendarAgent
from .task_agent        import TaskAgent
from .travel_agent      import TravelAgent
from .email_agent       import EmailAgent
from .contacts_agent    import ContactsAgent
from .sheets_agent      import SheetsAgent
from .notes_agent       import NotesAgent
from .conflict_agent    import ConflictAgent
from .resolution_agent  import ConflictResolutionAgent
from .planning_agent    import PlanningAgent
from .coordinator       import CoordinatorAgent

__all__ = [
    'CalendarAgent',
    'TaskAgent',
    'TravelAgent',
    'EmailAgent',
    'ContactsAgent',
    'SheetsAgent',
    'NotesAgent',
    'ConflictAgent',
    'ConflictResolutionAgent',
    'PlanningAgent',
    'CoordinatorAgent',
]
