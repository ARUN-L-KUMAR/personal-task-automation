"""
Google Contacts (People) API Utility

Functions:
- get_contacts(max_results)  → Fetch contacts list
- search_contacts(query)     → Search contacts by name
"""

from googleapiclient.discovery import build
from utils.google_auth import get_credentials


def _get_service():
    """Build Google People (Contacts) service."""
    creds = get_credentials()
    if not creds:
        raise Exception("Google not authenticated. Please connect Google account first.")
    return build("people", "v1", credentials=creds)


def get_contacts(max_results: int = 50):
    """
    Fetch contacts with name, email, and phone.
    
    Args:
        max_results: Maximum contacts to return
    """
    service = _get_service()
    
    results = service.people().connections().list(
        resourceName="people/me",
        pageSize=max_results,
        personFields="names,emailAddresses,phoneNumbers,organizations"
    ).execute()
    
    connections = results.get("connections", [])
    
    contacts = []
    for person in connections:
        names = person.get("names", [{}])
        emails = person.get("emailAddresses", [])
        phones = person.get("phoneNumbers", [])
        orgs = person.get("organizations", [])
        
        contacts.append({
            "name": names[0].get("displayName", "Unknown") if names else "Unknown",
            "email": emails[0].get("value", "") if emails else "",
            "phone": phones[0].get("value", "") if phones else "",
            "organization": orgs[0].get("name", "") if orgs else "",
        })
    
    return contacts


def search_contacts(query: str):
    """
    Search contacts by name.
    
    Args:
        query: Name to search for
    """
    service = _get_service()
    
    try:
        results = service.people().searchContacts(
            query=query,
            readMask="names,emailAddresses,phoneNumbers"
        ).execute()
        
        contacts = []
        for result in results.get("results", []):
            person = result.get("person", {})
            names = person.get("names", [{}])
            emails = person.get("emailAddresses", [])
            phones = person.get("phoneNumbers", [])
            
            contacts.append({
                "name": names[0].get("displayName", "Unknown") if names else "Unknown",
                "email": emails[0].get("value", "") if emails else "",
                "phone": phones[0].get("value", "") if phones else "",
            })
        
        return contacts
    except Exception as e:
        return [{"error": f"Search failed: {str(e)}"}]
