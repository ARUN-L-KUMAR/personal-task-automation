"""
Google OAuth2 Authentication Utility

Handles OAuth2 flow for all Google services:
- Google Calendar, Gmail, Maps, Contacts, Sheets, Tasks
"""

import os
import json
import traceback
from pathlib import Path

# Fix: Google sometimes returns different scope strings than requested.
# This env var tells oauthlib to accept the token despite scope differences.
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

# All scopes needed for the 7 Google services
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/drive.readonly",  # For listing Sheets files
]

BASE_DIR = Path(__file__).parent.parent
CREDENTIALS_FILE = BASE_DIR / "credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"
REDIRECT_URI = "http://localhost:8000/api/auth/google/callback"


def get_credentials() -> Credentials | None:
    """
    Get valid Google credentials.
    Returns None if not authenticated.
    """
    creds = None

    # Load existing token
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    # Refresh if expired
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            _save_token(creds)
        except Exception:
            # Token refresh failed, need re-auth
            creds = None

    return creds


def get_auth_url() -> str | None:
    """
    Generate Google OAuth2 authorization URL.
    Returns None if credentials.json is missing.
    """
    if not CREDENTIALS_FILE.exists():
        return None

    flow = Flow.from_client_secrets_file(
        str(CREDENTIALS_FILE),
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    return auth_url


def handle_auth_callback(code: str) -> bool:
    """
    Handle OAuth2 callback with authorization code.
    Returns True if successful.
    """
    if not CREDENTIALS_FILE.exists():
        return False

    try:
        flow = Flow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )

        flow.fetch_token(code=code)
        creds = flow.credentials
        _save_token(creds)
        return True
    except Exception as e:
        print(f"Auth callback error: {e}")
        traceback.print_exc()
        return False


def is_authenticated() -> bool:
    """Check if we have valid Google credentials."""
    creds = get_credentials()
    return creds is not None and creds.valid


def logout():
    """Remove stored token to log out."""
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()


def _save_token(creds: Credentials):
    """Save credentials to token.json."""
    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())
