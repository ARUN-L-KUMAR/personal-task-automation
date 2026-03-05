"""
Gmail API Router (Multi-User Version)

Endpoints:
- GET  /api/email/inbox  → Fetch recent emails (for current user)
- GET  /api/email/{id}   → Get email details
- POST /api/email/send   → Send an email
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from utils.google_auth import is_authenticated
from utils.google_gmail import get_inbox, get_message, send_email
from database.connection import get_db
from database.models import User
from middleware import get_current_user

router = APIRouter(prefix="/email", tags=["Email"])


@router.get("/inbox")
def fetch_inbox(
    max_results: int = Query(15, description="Number of emails"),
    query: Optional[str] = Query("", description="Gmail search query"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch recent inbox emails for the current user."""
    if not is_authenticated(current_user):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        emails = get_inbox(current_user, db, max_results=max_results, query=query)
        return {"status": "success", "emails": emails, "count": len(emails)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/message/{message_id}")
@router.get("/{message_id}")
def fetch_email_detail(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full email details."""
    if not is_authenticated(current_user):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        message = get_message(current_user, db, message_id)
        return {"status": "success", "email": message}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


@router.post("/send")
def send_new_email(
    to: str = Query(..., description="Recipient"),
    subject: str = Query(..., description="Subject"),
    body: str = Query(..., description="Body"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send an email from the current user's Gmail account."""
    if not is_authenticated(current_user):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        result = send_email(current_user, db, to=to, subject=subject, body=body)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
