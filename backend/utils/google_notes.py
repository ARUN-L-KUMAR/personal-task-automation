"""
Google Notes Utility (via Google Tasks API)

Since Google Keep has no official API, we use Google Tasks
with a dedicated "Notes" task list as a notes/reminders system.

Functions:
- get_notes()           → Fetch all notes
- create_note(title, content) → Create a note
- get_or_create_notes_list() → Ensure "Notes" list exists
"""

from utils.google_tasks import _get_service


NOTES_LIST_TITLE = "AI Agent Notes"


def get_or_create_notes_list():
    """Get or create the dedicated Notes task list."""
    service = _get_service()
    
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


def get_notes():
    """Fetch all notes from the Notes list."""
    service = _get_service()
    list_id = get_or_create_notes_list()
    
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


def create_note(title: str, content: str = ""):
    """
    Create a new note.
    
    Args:
        title: Note title
        content: Note content/body
    """
    service = _get_service()
    list_id = get_or_create_notes_list()
    
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


def delete_note(note_id: str):
    """Delete a note."""
    service = _get_service()
    list_id = get_or_create_notes_list()
    
    service.tasks().delete(
        tasklist=list_id,
        task=note_id
    ).execute()
    
    return {"status": "deleted", "id": note_id}
