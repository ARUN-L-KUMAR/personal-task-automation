"""
Google Notes Utility (via Google Tasks API) - Multi-User Version

Since Google Keep has no official API, we use Google Tasks
with a dedicated "Notes" task list as a notes/reminders system.

Functions:
- get_notes(user, db)           → Fetch all notes
- create_note(user, db, title, content) → Create a note
- get_or_create_notes_list(user, db) → Ensure "Notes" list exists
"""

from database.models import User
from sqlalchemy.orm import Session
from utils.google_tasks import _get_service


NOTES_LIST_TITLE = "AI Agent Notes"


def get_or_create_notes_list(user: User, db: Session):
    """Get or create the dedicated Notes task list."""
    service = _get_service(user, db)
    
    # Check if Notes list exists
    results = service.tasklists().list(maxResults=20).execute()
    task_lists = results.get("items", [])
    
    for tl in task_lists:
        if tl.get("title") == NOTES_LIST_TITLE:
            return tl["id"]
    
    # Create the Notes list
    new_list = service.tasklists().insert(
        body={"title": NOTES_LIST_TITLE}
    ).execute()
    
    return new_list["id"]


def get_notes(user: User, db: Session):
    """Fetch all notes from the Notes list."""
    service = _get_service(user, db)
    list_id = get_or_create_notes_list(user, db)
    
    results = service.tasks().list(
        tasklist=list_id,
        showCompleted=True,
        maxResults=50
    ).execute()
    
    tasks = results.get("items", [])
    
    return [
        {
            "id": task.get("id"),
            "title": task.get("title", "Untitled Note"),
            "content": task.get("notes", ""),
            "created": task.get("updated", ""),
            "status": task.get("status", ""),
        }
        for task in tasks
    ]


def create_note(user: User, db: Session, title: str, content: str = ""):
    """
    Create a new note.
    
    Args:
        user: User object
        db: Database session
        title: Note title
        content: Note content/body
    """
    service = _get_service(user, db)
    list_id = get_or_create_notes_list(user, db)
    
    task_body = {
        "title": title,
        "notes": content,
    }
    
    result = service.tasks().insert(
        tasklist=list_id,
        body=task_body
    ).execute()
    
    return {
        "id": result.get("id"),
        "title": result.get("title"),
        "content": result.get("notes", ""),
        "status": "created"
    }


def delete_note(user: User, db: Session, note_id: str):
    """Delete a note."""
    service = _get_service(user, db)
    list_id = get_or_create_notes_list(user, db)
    
    service.tasks().delete(
        tasklist=list_id,
        task=note_id
    ).execute()
    
    return {"status": "deleted", "id": note_id}
