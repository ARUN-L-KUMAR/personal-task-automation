"""
Google Tasks API Utility

Functions:
- get_task_lists()              → Get all task lists
- get_tasks(list_id)            → Get tasks from a list
- create_task(list_id, title, notes, due) → Create a task
- complete_task(list_id, task_id) → Mark task as completed
"""

from googleapiclient.discovery import build
from sqlalchemy.orm import Session

from utils.google_auth import get_credentials
from database.models import User


def _get_service(user: User, db: Session):
    """Build Google Tasks service for a specific user."""
    creds = get_credentials(user, db)
    if not creds:
        raise Exception("Google not authenticated. Please connect Google account first.")
    return build("tasks", "v1", credentials=creds)


def get_task_lists(user: User, db: Session):
    """Get all task lists for the specified user."""
    service = _get_service(user, db)
    
    results = service.tasklists().list(maxResults=20).execute()
    task_lists = results.get("items", [])
    
    return [
        {
            "id": tl.get("id"),
            "title": tl.get("title", "Untitled"),
            "updated": tl.get("updated", ""),
        }
        for tl in task_lists
    ]


def get_tasks(user: User, db: Session, list_id: str = "@default", show_completed: bool = False):
    """
    Get tasks from a specific list for the specified user.
    
    Args:
        user: User object
        db: Database session
        list_id: Task list ID (use "@default" for the default list)
        show_completed: Whether to include completed tasks
    """
    service = _get_service(user, db)
    
    results = service.tasks().list(
        tasklist=list_id,
        showCompleted=show_completed,
        maxResults=50
    ).execute()
    
    tasks = results.get("items", [])
    
    return [
        {
            "id": task.get("id"),
            "title": task.get("title", "Untitled"),
            "notes": task.get("notes", ""),
            "due": task.get("due", ""),
            "status": task.get("status", "needsAction"),
            "updated": task.get("updated", ""),
            "parent": task.get("parent", ""),
        }
        for task in tasks
    ]


def create_task(user: User, db: Session, title: str, notes: str = "", due: str = "", list_id: str = "@default"):
    """
    Create a new task for the specified user.
    
    Args:
        user: User object
        db: Database session
        title: Task title
        notes: Task notes/description
        due: Due date in RFC 3339 format (e.g., "2026-02-23T00:00:00.000Z")
        list_id: Task list ID
    """
    service = _get_service(user, db)
    
    task_body = {"title": title}
    if notes:
        task_body["notes"] = notes
    if due:
        task_body["due"] = due
    
    result = service.tasks().insert(
        tasklist=list_id,
        body=task_body
    ).execute()
    
    return {
        "id": result.get("id"),
        "title": result.get("title"),
        "status": "created"
    }


def complete_task(user: User, db: Session, task_id: str, list_id: str = "@default"):
    """Mark a task as completed for the specified user."""
    service = _get_service(user, db)
    
    task = service.tasks().get(tasklist=list_id, task=task_id).execute()
    task["status"] = "completed"
    
    result = service.tasks().update(
        tasklist=list_id,
        task=task_id,
        body=task
    ).execute()
    
    return {
        "id": result.get("id"),
        "title": result.get("title"),
        "status": "completed"
    }
