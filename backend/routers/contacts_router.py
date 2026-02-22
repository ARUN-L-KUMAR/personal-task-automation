"""
Google Contacts API Router

Endpoints:
- GET /api/contacts        → Fetch contacts list
- GET /api/contacts/search → Search contacts by name
"""

from fastapi import APIRouter, HTTPException, Query
from utils.google_auth import is_authenticated
from utils.google_contacts import get_contacts, search_contacts

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


def _check_auth():
    if not is_authenticated():
        raise HTTPException(status_code=401, detail="Google not authenticated. Please connect Google account.")


@router.get("")
def fetch_contacts(max_results: int = Query(50, description="Max contacts to return")):
    """Fetch contacts list."""
    _check_auth()
    try:
        contacts = get_contacts(max_results=max_results)
        return {"status": "success", "contacts": contacts, "count": len(contacts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
def search_contact(query: str = Query(..., description="Name to search for")):
    """Search contacts by name."""
    _check_auth()
    try:
        contacts = search_contacts(query=query)
        return {"status": "success", "contacts": contacts, "count": len(contacts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
