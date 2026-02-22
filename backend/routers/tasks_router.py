"""
Google Tasks & Notes API Router

Endpoints:
- GET  /api/tasks       → Fetch Google Tasks
- POST /api/tasks       → Create a new task
- GET  /api/notes       → Fetch notes
- POST /api/notes       → Create a note
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from utils.google_auth import is_authenticated
from utils.google_tasks import get_task_lists, get_tasks, create_task, complete_task
from utils.google_notes import get_notes, create_note, delete_note

router = APIRouter(prefix="/tasks", tags=["Tasks & Notes"])


def _check_auth():
    if not is_authenticated():
        raise HTTPException(status_code=401, detail="Google not authenticated. Please connect Google account.")


# ---- Tasks ----

@router.get("/list")
def fetch_tasks(list_id: str = Query("@default", description="Task list ID")):
    """Fetch Google Tasks."""
    _check_auth()
    try:
        tasks = get_tasks(list_id=list_id)
        return {"status": "success", "tasks": tasks, "count": len(tasks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lists")
def fetch_task_lists():
    """Fetch all task lists."""
    _check_auth()
    try:
        lists = get_task_lists()
        return {"status": "success", "task_lists": lists, "count": len(lists)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateTaskRequest(BaseModel):
    title: str
    notes: str = ""
    due: str = ""
    list_id: str = "@default"


@router.post("/create")
@router.post("")
def create_new_task(
    title: str = Query(..., description="Task title"),
    notes: str = Query("", description="Task notes"),
    due: str = Query("", description="Task due date"),
    list_id: str = Query("@default", description="Task list ID")
):
    """Create a new task."""
    _check_auth()
    try:
        result = create_task(
            title=title,
            notes=notes,
            due=due,
            list_id=list_id
        )
        return {"status": "success", "task": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/complete/{task_id}")
@router.post("/{task_id}/complete")
def mark_task_complete(task_id: str, list_id: str = Query("@default")):
    """Mark a task as completed."""
    _check_auth()
    try:
        result = complete_task(task_id=task_id, list_id=list_id)
        return {"status": "success", "task": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
def delete_task_item(task_id: str, list_id: str = Query("@default")):
    """Delete a task."""
    _check_auth()
    try:
        service = get_tasks.__globals__.get('_get_service', None)
        # Use the tasks API directly
        from utils.google_tasks import _get_service as _ts
        svc = _ts()
        svc.tasks().delete(tasklist=list_id, task=task_id).execute()
        return {"status": "deleted", "id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Notes ----

@router.get("/notes")
def fetch_notes():
    """Fetch notes."""
    _check_auth()
    try:
        notes = get_notes()
        return {"status": "success", "notes": notes, "count": len(notes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateNoteRequest(BaseModel):
    title: str
    content: str = ""


@router.post("/notes")
def create_new_note(note: CreateNoteRequest):
    """Create a new note."""
    _check_auth()
    try:
        result = create_note(title=note.title, content=note.content)
        return {"status": "success", "note": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notes/{note_id}")
def delete_note_item(note_id: str):
    """Delete a note."""
    _check_auth()
    try:
        result = delete_note(note_id)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
