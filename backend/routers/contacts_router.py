"""
Google Contacts API Router (Multi-User Version)

Endpoints:
- GET /api/contacts        → Fetch contacts list
- GET /api/contacts/search → Search contacts by name
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from utils.google_auth import is_authenticated
from utils.google_contacts import get_contacts, search_contacts
from database.connection import get_db
from database.models import User
from middleware import get_current_user

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.get("")
def fetch_contacts(
    max_results: int = Query(50, description="Max contacts to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch contacts list."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        contacts = get_contacts(current_user, db, max_results=max_results)
        return {"status": "success", "contacts": contacts, "count": len(contacts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
def search_contact(
    query: str = Query(..., description="Name to search for"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search contacts by name."""
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")
    
    try:
        contacts = search_contacts(current_user, db, query=query)
        return {"status": "success", "contacts": contacts, "count": len(contacts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
