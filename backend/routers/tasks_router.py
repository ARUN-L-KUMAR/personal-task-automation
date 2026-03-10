"""
Google Tasks & Notes API Router (Multi-User Version)

Endpoints:
- GET  /api/tasks       → Fetch Google Tasks
- POST /api/tasks       → Create a new task
- GET  /api/notes       → Fetch notes
- POST /api/notes       → Create a note
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from utils.google_auth import is_authenticated
from utils.google_tasks import get_task_lists, get_tasks, create_task, complete_task
from utils.google_notes import get_notes, create_note, delete_note
from database.connection import get_db
from database.models import User
from middleware import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks & Notes"])


# ---- Tasks ----

@router.get("/list")
def fetch_tasks(
    list_id: str = Query("@default", description="Task list ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch Google Tasks."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        tasks = get_tasks(current_user, db, list_id=list_id)
        return {"status": "success", "tasks": tasks, "count": len(tasks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lists")
def fetch_task_lists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all task lists."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        lists = get_task_lists(current_user, db)
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
    list_id: str = Query("@default", description="Task list ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        result = create_task(
            current_user,
            db,
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
def mark_task_complete(
    task_id: str,
    list_id: str = Query("@default"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a task as completed."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        result = complete_task(current_user, db, task_id=task_id, list_id=list_id)
        return {"status": "success", "task": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
def delete_task_item(
    task_id: str,
    list_id: str = Query("@default"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        from utils.google_tasks import _get_service
        svc = _get_service(current_user, db)
        svc.tasks().delete(tasklist=list_id, task=task_id).execute()
        return {"status": "deleted", "id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Notes ----

@router.get("/notes")
def fetch_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch notes."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        notes = get_notes(current_user, db)
        return {"status": "success", "notes": notes, "count": len(notes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateNoteRequest(BaseModel):
    title: str
    content: str = ""


@router.post("/notes")
def create_new_note(
    note: CreateNoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new note."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        result = create_note(current_user, db, title=note.title, content=note.content)
        return {"status": "success", "note": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notes/{note_id}")
def delete_note_item(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a note."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        result = delete_note(current_user, db, note_id)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
