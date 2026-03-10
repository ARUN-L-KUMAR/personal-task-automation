"""
Google OAuth2 Authentication Utility (Multi-User Database Version)

Handles OAuth2 flow for all Google services:
- Google Calendar, Gmail, Maps, Contacts, Sheets, Tasks

SCALABLE: Stores tokens per-user in database instead of single token.json file.
"""

import os
import traceback
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session

# Fix: Google sometimes returns different scope strings than requested.
# This env var tells oauthlib to accept the token despite scope differences.
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

from database.models import User, GoogleToken

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
REDIRECT_URI = "http://localhost:8000/api/auth/google/callback"


def get_credentials(user: User, db: Session) -> Credentials | None:
    """
    Get valid Google credentials for a specific user from google_tokens table.
    Returns None if user hasn't connected Google.
    """
    token_row = db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first()
    if not token_row:
        return None

    # Build credentials from google_tokens table
    creds = Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=_get_client_id(),
        client_secret=_get_client_secret(),
        scopes=SCOPES
    )

    # Refresh if expired
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            _save_token_to_db(user, creds, db)
        except Exception as e:
            print(f"Token refresh failed: {e}")
            return None

    return creds


def get_auth_url(user_id: str) -> str | None:
    """
    Generate Google OAuth2 authorization URL.
    Uses state parameter to track which user is connecting.
    Returns None if credentials.json is missing.
    """
    if not CREDENTIALS_FILE.exists():
        return None

    flow = Flow.from_client_secrets_file(
        str(CREDENTIALS_FILE),
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
        state=user_id  # Track which user is connecting
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    return auth_url


def handle_auth_callback(code: str, state: str, user: User, db: Session) -> bool:
    """
    Handle OAuth2 callback with authorization code.
    Saves tokens to the user's database record.
    Returns True if successful.
    """
    if not CREDENTIALS_FILE.exists():
        return False

    try:
        flow = Flow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI,
            state=state
        )

        flow.fetch_token(code=code)
        creds = flow.credentials
        _save_token_to_db(user, creds, db)
        return True
    except Exception as e:
        print(f"Auth callback error: {e}")
        traceback.print_exc()
        return False


def is_authenticated(user: User, db: Session) -> bool:
    """Check if user has connected Google services (via google_tokens table)."""
    return db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first() is not None


def logout(user: User, db: Session):
    """Disconnect Google services — delete token row."""
    db.query(GoogleToken).filter(GoogleToken.user_id == user.id).delete()
    db.commit()


def _save_token_to_db(user: User, creds: Credentials, db: Session):
    """Upsert Google credentials into google_tokens table."""
    token_row = db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first()

    if token_row:
        # Update existing row
        token_row.access_token = creds.token
        if creds.refresh_token:
            token_row.refresh_token = creds.refresh_token
        token_row.token_expiry = creds.expiry
        token_row.scope = " ".join(SCOPES)
    else:
        # Create new row
        token_row = GoogleToken(
            user_id=user.id,
            access_token=creds.token,
            refresh_token=creds.refresh_token,
            token_expiry=creds.expiry,
            scope=" ".join(SCOPES),
        )
        db.add(token_row)

    db.commit()


# Global client cache
_CLIENT_CONFIG = {"id": None, "secret": None}


def _load_client_config():
    """Load client ID and secret from credentials.json if not cached."""
    if _CLIENT_CONFIG["id"]:
        return _CLIENT_CONFIG

    if not CREDENTIALS_FILE.exists():
        return None

    import json
    try:
        with open(CREDENTIALS_FILE) as f:
            data = json.load(f)
            _CLIENT_CONFIG["id"] = data["web"]["client_id"]
            _CLIENT_CONFIG["secret"] = data["web"]["client_secret"]
        return _CLIENT_CONFIG
    except Exception as e:
        print(f"Error loading credentials.json: {e}")
        return None


def _get_client_id() -> str:
    """Read client_id from credentials.json (cached)."""
    config = _load_client_config()
    return config["id"] if config else ""


def _get_client_secret() -> str:
    """Read client_secret from credentials.json (cached)."""
    config = _load_client_config()
    return config["secret"] if config else ""


def get_credentials(user: User, db: Session) -> Credentials | None:
    """
    Get valid Google credentials for a specific user from google_tokens table.
    Returns None if user hasn't connected Google.
    """
    config = _load_client_config()
    if not config:
        return None

    # Check if tokens are already loaded on the user object (cached via joinedload)
    token_row = None
    if hasattr(user, "google_tokens") and user.google_tokens:
        token_row = user.google_tokens[0]
    else:
        # Fallback to direct query if not pre-fetched
        token_row = db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first()
    
    if not token_row:
        return None

    # Build credentials from google_tokens table
    creds = Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=config["id"],
        client_secret=config["secret"],
        scopes=SCOPES
    )

    # Refresh if expired (creds.expired adds a tiny buffer)
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            _save_token_to_db(user, creds, db)
        except Exception as e:
            print(f"Token refresh failed: {e}")
            return None

    return creds


def get_auth_url(user_id: str) -> str | None:
    """
    Generate Google OAuth2 authorization URL.
    Uses state parameter to track which user is connecting.
    Returns None if credentials.json is missing.
    """
    if not CREDENTIALS_FILE.exists():
        return None

    flow = Flow.from_client_secrets_file(
        str(CREDENTIALS_FILE),
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
        state=user_id  # Track which user is connecting
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    return auth_url


def handle_auth_callback(code: str, state: str, user: User, db: Session) -> bool:
    """
    Handle OAuth2 callback with authorization code.
    Saves tokens to the user's database record.
    Returns True if successful.
    """
    if not CREDENTIALS_FILE.exists():
        return False

    try:
        flow = Flow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI,
            state=state
        )

        flow.fetch_token(code=code)
        creds = flow.credentials
        _save_token_to_db(user, creds, db)
        return True
    except Exception as e:
        print(f"Auth callback error: {e}")
        traceback.print_exc()
        return False


def is_authenticated(user: User, db: Session) -> bool:
    """Check if user has connected Google services (via google_tokens table)."""
    if hasattr(user, "google_tokens") and user.google_tokens:
        return True
    return db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first() is not None


def logout(user: User, db: Session):
    """Disconnect Google services — delete token row."""
    db.query(GoogleToken).filter(GoogleToken.user_id == user.id).delete()
    db.commit()


def _save_token_to_db(user: User, creds: Credentials, db: Session):
    """Upsert Google credentials into google_tokens table."""
    token_row = db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first()

    if token_row:
        # Update existing row
        token_row.access_token = creds.token
        if creds.refresh_token:
            token_row.refresh_token = creds.refresh_token
        token_row.token_expiry = creds.expiry
        token_row.scope = " ".join(SCOPES)
    else:
        # Create new row
        token_row = GoogleToken(
            user_id=user.id,
            access_token=creds.token,
            refresh_token=creds.refresh_token,
            token_expiry=creds.expiry,
            scope=" ".join(SCOPES),
        )
        db.add(token_row)

    db.commit()
