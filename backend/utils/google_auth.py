"""
Google OAuth2 Authentication Utility (Multi-User Database Version)

Handles OAuth2 flow for all Google services:
- Google Calendar, Gmail, Maps, Contacts, Sheets, Tasks

SCALABLE: Stores tokens per-user in database instead of single token.json file.
"""

import os
import traceback
import json
from pathlib import Path
from datetime import datetime
from urllib.request import Request as UrlRequest, urlopen
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
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
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


def get_redirect_uri() -> str:
    """Resolve OAuth callback URI from environment, fallback to local dev."""
    return os.getenv("GOOGLE_REDIRECT_URI", REDIRECT_URI)


def _build_oauth_flow(state: str) -> Flow | None:
    """Build OAuth flow from credentials.json or env-provided client credentials."""
    redirect_uri = get_redirect_uri()

    if CREDENTIALS_FILE.exists():
        return Flow.from_client_secrets_file(
            str(CREDENTIALS_FILE),
            scopes=SCOPES,
            redirect_uri=redirect_uri,
            state=state,
        )

    client_id = _get_client_id()
    client_secret = _get_client_secret()
    if not client_id or not client_secret:
        return None

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
        state=state,
    )


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


def ensure_fresh_credentials(user: User, db: Session) -> Credentials | None:
    """
    Get valid, fresh Google credentials for a user.
    Proactively refreshes if token is expired or close to expiry.
    
    Returns None if tokens cannot be refreshed or user hasn't connected Google.
    Raises exception only if refresh fails unexpectedly.
    """
    token_row = db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first()
    if not token_row:
        return None

    # Build credentials
    creds = Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=_get_client_id(),
        client_secret=_get_client_secret(),
        scopes=SCOPES
    )

    # Check if expired or close to expiry (with 5-minute buffer)
    from datetime import datetime, timedelta
    if creds.expiry and datetime.utcnow() >= creds.expiry - timedelta(minutes=5):
        if not creds.refresh_token:
            print(f"Token expired for user {user.id} and no refresh token available")
            return None
            
        try:
            creds.refresh(Request())
            _save_token_to_db(user, creds, db)
            print(f"Token refreshed successfully for user {user.id}")
        except Exception as e:
            print(f"Token refresh failed for user {user.id}: {str(e)}")
            raise

    return creds


def get_auth_url(user_id: str) -> str | None:
    """
    Generate Google OAuth2 authorization URL.
    Uses state parameter to track which user is connecting.
    Returns None if credentials.json is missing.
    """
    flow = _build_oauth_flow(user_id)
    if not flow:
        return None

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
    try:
        flow = _build_oauth_flow(state)
        if not flow:
            return False

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


def handle_auth_callback_with_email_guard(code: str, state: str, user: User, db: Session) -> tuple[bool, str | None, str | None]:
    """
        Handle OAuth callback with account-lock rules:

        - Normal users (email/password): first Google connect can be any account.
            On first successful connect we lock to that Google account id (sub).
        - After lock exists, reconnects must use the same Google account id.
        - Google-sign-in users must still match their registered account on first lock.

    Returns:
      (True, None, matched_email) on success
      (False, reason_code, observed_google_email_or_none) on failure
    """

    def _fetch_identity(access_token: str) -> tuple[str | None, str | None]:
        if not access_token:
            return None, None
        try:
            request = UrlRequest(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            with urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
                email = (payload.get("email") or "").strip().lower() or None
                sub = (payload.get("sub") or "").strip() or None
                return email, sub
        except Exception as identity_error:
            print(f"Failed to fetch Google identity: {identity_error}")
            return None, None

    try:
        flow = _build_oauth_flow(state)
        if not flow:
            return False, "oauth_flow_unavailable", None

        flow.fetch_token(code=code)
        creds = flow.credentials

        observed_email, observed_sub = _fetch_identity(creds.token)
        if not observed_email or not observed_sub:
            return False, "google_userinfo_unavailable", None

        # Existing lock: always enforce same Google account id.
        if user.google_id:
            if observed_sub != user.google_id:
                return False, "google_account_mismatch", observed_email
        else:
            # Legacy behavior: user may already be connected but lock (google_id) was not persisted.
            existing_token_row = db.query(GoogleToken).filter(GoogleToken.user_id == user.id).first()
            if existing_token_row:
                existing_creds = get_credentials(user, db)
                existing_email, existing_sub = _fetch_identity(existing_creds.token) if existing_creds and existing_creds.token else (None, None)
                if not existing_sub:
                    return False, "existing_google_identity_unavailable", observed_email
                if observed_sub != existing_sub:
                    return False, "google_account_mismatch", observed_email

                # Persist lock for future reconnect checks.
                user.google_id = existing_sub
            else:
                # First-time connect must not hijack an email already registered to another user.
                existing_owner = db.query(User).filter(User.email.ilike(observed_email)).first()
                if existing_owner and str(existing_owner.id) != str(user.id):
                    return False, "google_email_already_registered", observed_email

                # First-time connect behavior differs by account type.
                # Google-sign-in users should still match their own registered email.
                if bool(user.is_google_user):
                    expected_email = (user.email or "").strip().lower()
                    if observed_email != expected_email:
                        return False, "registered_email_mismatch", observed_email

                # Lock account to the first connected Google identity.
                user.google_id = observed_sub

        _save_token_to_db(user, creds, db)
        return True, None, observed_email
    except Exception as e:
        print(f"Auth callback (email guard) error: {e}")
        traceback.print_exc()
        return False, "callback_failed", None


# Global client cache
_CLIENT_CONFIG = {"id": None, "secret": None}


def _load_client_config():
    """Load client ID and secret — env vars take priority over credentials.json."""
    if _CLIENT_CONFIG["id"]:
        return _CLIENT_CONFIG

    # 1. Try environment variables first (needed for Render deployment)
    env_id = os.getenv("GOOGLE_CLIENT_ID")
    env_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if env_id and env_secret:
        _CLIENT_CONFIG["id"] = env_id
        _CLIENT_CONFIG["secret"] = env_secret
        return _CLIENT_CONFIG

    # 2. Fallback: read from credentials.json (local dev)
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
    """Get Google client ID from env vars or credentials.json."""
    config = _load_client_config()
    return config["id"] if config else ""


def _get_client_secret() -> str:
    """Get Google client secret from env vars or credentials.json."""
    config = _load_client_config()
    return config["secret"] if config else ""


def get_credentials(user: User, db: Session) -> Credentials | None:
    """
    Get valid Google credentials for a specific user from google_tokens table.
    Returns None if user hasn't connected Google.
    """
    client_id = _get_client_id()
    client_secret = _get_client_secret()
    if not client_id or not client_secret:
        print("Google OAuth client credentials not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars)")
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
        client_id=client_id,
        client_secret=client_secret,
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
    flow = _build_oauth_flow(user_id)
    if not flow:
        return None

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
    try:
        flow = _build_oauth_flow(state)
        if not flow:
            return False

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
