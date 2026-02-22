"""
Google Gmail API Utility

Functions:
- get_inbox(max_results)  → Fetch recent inbox emails
- get_message(msg_id)     → Get full message details
- send_email(to, subject, body) → Send an email
"""

import base64
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from utils.google_auth import get_credentials


def _get_service():
    """Build Gmail service."""
    creds = get_credentials()
    if not creds:
        raise Exception("Google not authenticated. Please connect Google account first.")
    return build("gmail", "v1", credentials=creds)


def get_inbox(max_results: int = 15, query: str = ""):
    """
    Fetch recent inbox emails.
    
    Args:
        max_results: Number of emails to fetch
        query: Gmail search query (e.g., "is:unread", "from:boss@email.com")
    """
    service = _get_service()
    
    search_query = query if query else "in:inbox"
    
    results = service.users().messages().list(
        userId="me",
        maxResults=max_results,
        q=search_query
    ).execute()
    
    messages = results.get("messages", [])
    emails = []
    
    for msg in messages:
        msg_detail = service.users().messages().get(
            userId="me",
            id=msg["id"],
            format="metadata",
            metadataHeaders=["From", "Subject", "Date"]
        ).execute()
        
        headers = {h["name"]: h["value"] for h in msg_detail.get("payload", {}).get("headers", [])}
        
        emails.append({
            "id": msg["id"],
            "from": headers.get("From", "Unknown"),
            "subject": headers.get("Subject", "No Subject"),
            "date": headers.get("Date", ""),
            "snippet": msg_detail.get("snippet", ""),
            "is_unread": "UNREAD" in msg_detail.get("labelIds", []),
            "labels": msg_detail.get("labelIds", []),
        })
    
    return emails


def get_message(msg_id: str):
    """Get full message details including body."""
    service = _get_service()
    
    msg = service.users().messages().get(
        userId="me",
        id=msg_id,
        format="full"
    ).execute()
    
    headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
    
    # Extract body
    body = ""
    payload = msg.get("payload", {})
    if "parts" in payload:
        for part in payload["parts"]:
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                break
    elif "body" in payload:
        data = payload["body"].get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
    
    return {
        "id": msg_id,
        "from": headers.get("From", "Unknown"),
        "to": headers.get("To", ""),
        "subject": headers.get("Subject", "No Subject"),
        "date": headers.get("Date", ""),
        "body": body[:2000],  # Limit body length
        "snippet": msg.get("snippet", ""),
        "labels": msg.get("labelIds", []),
    }


def send_email(to: str, subject: str, body: str):
    """Send an email."""
    service = _get_service()
    
    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    
    sent = service.users().messages().send(
        userId="me",
        body={"raw": raw}
    ).execute()
    
    return {
        "id": sent.get("id"),
        "status": "sent",
        "to": to,
        "subject": subject
    }
