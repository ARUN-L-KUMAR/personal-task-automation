"""
Notes Router — CRUD for Google Tasks "AI Agent Notes" list

Endpoints:
  GET    /api/notes       → List all notes
  POST   /api/notes       → Create a note
  PUT    /api/notes/{id}  → Update a note
  DELETE /api/notes/{id}  → Delete a note
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User
from utils.google_auth import is_authenticated
from utils.google_notes import get_notes, create_note, delete_note, get_or_create_notes_list
from middleware import get_current_user

router = APIRouter(prefix="/notes", tags=["Notes"])


class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


def _require_google(user: User, db: Session):
    if not is_authenticated(user, db):
        raise HTTPException(status_code=401, detail="Google not connected.")


@router.get("")
def list_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch all notes from the AI Agent Notes list."""
    _require_google(current_user, db)
    try:
        notes = get_notes(current_user, db)
        return {"status": "success", "notes": notes, "count": len(notes)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google API error: {e}")


@router.post("", status_code=201)
def add_note(
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new note in the AI Agent Notes list."""
    _require_google(current_user, db)
    try:
        result = create_note(current_user, db, title=payload.title, content=payload.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google API error: {e}")


@router.put("/{note_id}")
def update_note(
    note_id: str,
    payload: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing note."""
    _require_google(current_user, db)
    try:
        from utils.google_notes import get_or_create_notes_list
        from utils.google_tasks import _get_service

        service = _get_service(current_user, db)
        list_id = get_or_create_notes_list(current_user, db)

        # Get current task first, then patch
        existing = service.tasks().get(tasklist=list_id, task=note_id).execute()
        if payload.title is not None:
            existing["title"] = payload.title
        if payload.content is not None:
            existing["notes"] = payload.content

        updated = service.tasks().update(
            tasklist=list_id, task=note_id, body=existing
        ).execute()

        return {
            "id": updated.get("id"),
            "title": updated.get("title"),
            "content": updated.get("notes", ""),
            "status": "updated",
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google API error: {e}")


@router.delete("/{note_id}")
def remove_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a note from the AI Agent Notes list."""
    _require_google(current_user, db)
    try:
        result = delete_note(current_user, db, note_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google API error: {e}")
