"""
Gmail API Router

Endpoints:
- GET  /api/emails/inbox  → Fetch recent emails
- GET  /api/emails/{id}   → Get email details
- POST /api/emails/send   → Send an email
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from utils.google_auth import is_authenticated
from utils.google_gmail import get_inbox, get_message, send_email

router = APIRouter(prefix="/api/emails", tags=["Emails"])


def _check_auth():
    if not is_authenticated():
        raise HTTPException(status_code=401, detail="Google not authenticated. Please connect Google account.")


@router.get("/inbox")
def fetch_inbox(
    max_results: int = Query(15, description="Number of emails"),
    query: Optional[str] = Query("", description="Gmail search query")
):
    """Fetch recent inbox emails."""
    _check_auth()
    try:
        emails = get_inbox(max_results=max_results, query=query)
        return {"status": "success", "emails": emails, "count": len(emails)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{message_id}")
def fetch_email_detail(message_id: str):
    """Get full email details."""
    _check_auth()
    try:
        message = get_message(message_id)
        return {"status": "success", "email": message}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str


@router.post("/send")
def send_new_email(email: SendEmailRequest):
    """Send an email."""
    _check_auth()
    try:
        result = send_email(to=email.to, subject=email.subject, body=email.body)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
