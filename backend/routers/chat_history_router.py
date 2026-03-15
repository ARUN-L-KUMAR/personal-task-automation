"""
Chat History Router — Persists chat sessions to database for cross-device sync.

Endpoints:
  GET    /api/chat-history/sessions         → List all sessions for current user
  POST   /api/chat-history/sessions         → Create or update a session
  GET    /api/chat-history/sessions/{id}    → Get a single session
  DELETE /api/chat-history/sessions/{id}    → Delete a session
  DELETE /api/chat-history/sessions         → Delete all sessions for current user
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.connection import get_db
from database.models import User, ChatSession
from middleware import get_current_user

router = APIRouter(prefix="/chat-history", tags=["Chat History"])

MAX_SESSIONS_PER_USER = 50


# ── Pydantic schemas ──

class MessagePayload(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    usedContext: Optional[bool] = None
    error: Optional[bool] = None
    meta: Optional[dict] = None


class SessionCreateRequest(BaseModel):
    session_id: Optional[str] = None  # If provided, updates existing session
    title: str
    messages: List[MessagePayload]


class SessionResponse(BaseModel):
    id: str
    title: str
    messages: List[dict]
    created_at: str
    updated_at: str


class SessionListItem(BaseModel):
    id: str
    title: str
    message_count: int
    created_at: str
    updated_at: str


# ── Endpoints ──

@router.get("/sessions", response_model=List[SessionListItem])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the current user (newest first)."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .limit(MAX_SESSIONS_PER_USER)
        .all()
    )
    return [
        SessionListItem(
            id=str(s.id),
            title=s.title,
            message_count=len(s.messages) if s.messages else 0,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
        )
        for s in sessions
    ]


@router.post("/sessions", response_model=SessionResponse)
def upsert_session(
    payload: SessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new session or update an existing one."""
    messages_data = [m.dict() for m in payload.messages]

    if payload.session_id:
        # Update existing session
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == payload.session_id,
                ChatSession.user_id == current_user.id,
            )
            .first()
        )
        if session:
            session.title = payload.title
            session.messages = messages_data
            session.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)
            return SessionResponse(
                id=str(session.id),
                title=session.title,
                messages=session.messages,
                created_at=session.created_at.isoformat(),
                updated_at=session.updated_at.isoformat(),
            )
        # If session_id not found, fall through to create new

    # Check limit — delete oldest if over max
    count = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .count()
    )
    if count >= MAX_SESSIONS_PER_USER:
        oldest = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == current_user.id)
            .order_by(ChatSession.updated_at)
            .first()
        )
        if oldest:
            db.delete(oldest)

    # Create new session
    new_session = ChatSession(
        user_id=current_user.id,
        title=payload.title,
        messages=messages_data,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return SessionResponse(
        id=str(new_session.id),
        title=new_session.title,
        messages=new_session.messages,
        created_at=new_session.created_at.isoformat(),
        updated_at=new_session.updated_at.isoformat(),
    )


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single session with full messages."""
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        id=str(session.id),
        title=session.title,
        messages=session.messages,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a single chat session."""
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()
    return {"status": "deleted", "id": session_id}


@router.delete("/sessions")
def delete_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all chat sessions for the current user."""
    deleted = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .delete()
    )
    db.commit()
    return {"status": "deleted", "count": deleted}
