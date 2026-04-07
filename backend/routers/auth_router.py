"""
Google OAuth2 Authentication Router (Unified Multi-User Version)

Endpoints:
- GET  /api/auth/google                    → Start OAuth for login + services (NEW USER FLOW)
- GET  /api/auth/google-connect           → Connect services to existing logged-in user
- GET  /api/auth/google/callback          → Handle OAuth callback (unified)
- GET  /api/auth/status                    → Check auth status (per user)
- POST /api/auth/logout                    → Logout (remove token per user)

SUPPORTS: Both new user login AND existing user service connection.
"""

import base64
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.parse import urlencode, urlparse, parse_qs, urlunparse

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from utils.google_auth import (
    get_auth_url, handle_auth_callback, is_authenticated, logout,
    _save_token_to_db, SCOPES, _get_client_id, _get_client_secret, get_redirect_uri, get_credentials,
)
from database.connection import get_db
from database.models import User
from middleware import get_current_user
from services import create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
optional_bearer = HTTPBearer(auto_error=False)

FRONTEND_LOGIN_REDIRECT = os.getenv("FRONTEND_LOGIN_REDIRECT", "http://localhost:3000/login")
FRONTEND_SETTINGS_REDIRECT = os.getenv("FRONTEND_SETTINGS_REDIRECT", "http://localhost:3000/settings")

GOOGLE_SERVICE_KEYS = ["Calendar", "Gmail", "Tasks", "Contacts", "Drive"]


def _empty_service_status() -> dict[str, bool]:
    return {service: False for service in GOOGLE_SERVICE_KEYS}


def _probe_google_service_status(creds) -> dict[str, bool]:
    """Probe each Google API with a lightweight request to confirm service-level connectivity."""
    from googleapiclient.discovery import build

    status = _empty_service_status()

    def check_calendar() -> bool:
        try:
            calendar = build("calendar", "v3", credentials=creds)
            calendar.events().list(
                calendarId="primary",
                timeMin=datetime.now(timezone.utc).isoformat(),
                maxResults=1,
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            return True
        except Exception:
            return False

    def check_gmail() -> bool:
        try:
            gmail = build("gmail", "v1", credentials=creds)
            gmail.users().labels().list(userId="me").execute()
            return True
        except Exception:
            return False

    def check_tasks() -> bool:
        try:
            tasks = build("tasks", "v1", credentials=creds)
            tasks.tasklists().list(maxResults=1).execute()
            return True
        except Exception:
            return False

    def check_contacts() -> bool:
        try:
            people = build("people", "v1", credentials=creds)
            people.people().get(resourceName="people/me", personFields="names").execute()
            return True
        except Exception:
            return False

    def check_drive() -> bool:
        try:
            drive = build("drive", "v3", credentials=creds)
            drive.files().list(pageSize=1, fields="files(id)").execute()
            return True
        except Exception:
            return False

    checks = {
        "Calendar": check_calendar,
        "Gmail": check_gmail,
        "Tasks": check_tasks,
        "Contacts": check_contacts,
        "Drive": check_drive,
    }

    with ThreadPoolExecutor(max_workers=len(checks)) as executor:
        futures = {executor.submit(fn): key for key, fn in checks.items()}
        for future in as_completed(futures, timeout=10):
            key = futures[future]
            try:
                status[key] = bool(future.result())
            except Exception:
                status[key] = False

    return status


def _append_query(url: str, params: dict[str, str]) -> str:
    parsed = urlparse(url)
    existing = parse_qs(parsed.query)
    for key, value in params.items():
        existing[key] = [value]
    query = urlencode(existing, doseq=True)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, query, parsed.fragment))


def _encode_mobile_state(redirect_uri: str) -> str:
    payload = {
        "flow": "mobile_login",
        "redirect_uri": redirect_uri,
    }
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    token = base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")
    return f"mobile:{token}"


def _decode_mobile_state(state: str) -> dict | None:
    if not state or not state.startswith("mobile:"):
        return None
    data = state.split(":", 1)[1]
    padding = "=" * (-len(data) % 4)
    try:
        raw = base64.urlsafe_b64decode((data + padding).encode("utf-8")).decode("utf-8")
        payload = json.loads(raw)
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


async def _handle_google_login_exchange(code: str, db: Session) -> tuple[str, str]:
    import httpx

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": _get_client_id(),
                "client_secret": _get_client_secret(),
                "redirect_uri": get_redirect_uri(),
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")

        tokens = token_response.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)

        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")

        userinfo = user_response.json()
        email = userinfo.get("email")
        name = userinfo.get("name", "")
        google_id = userinfo.get("sub", "")

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            from services import hash_password
            user = User(
                name=name or email.split("@")[0],
                email=email,
                password=hash_password("GOOGLE_OAUTH_" + google_id),
                is_google_user=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        from datetime import datetime, timedelta
        from google.oauth2.credentials import Credentials as GoogleCreds
        creds_obj = GoogleCreds(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=_get_client_id(),
            client_secret=_get_client_secret(),
            scopes=SCOPES,
            expiry=datetime.utcnow() + timedelta(seconds=expires_in),
        )
        _save_token_to_db(user, creds_obj, db)

        jwt_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        return jwt_token, email


@router.get("/google")
def google_auth_login(db: Session = Depends(get_db)):
    """
    Start Google OAuth2 flow for NEW USER LOGIN + SERVICE CONNECTION.
    Use this on login/signup page - creates account if needed.
    State param: 'new' to indicate login flow.
    """
    url = get_auth_url("new")  # Special state for new login
    if not url:
        raise HTTPException(
            status_code=500,
            detail="credentials.json not found. Please set up Google Cloud OAuth2 credentials."
        )
    return RedirectResponse(url=url)


@router.get("/google-mobile")
def google_auth_mobile(
    redirect_uri: str = Query(..., description="Deep-link URI such as personaltask://auth"),
    db: Session = Depends(get_db),
):
    """
    Start Google OAuth2 flow for mobile clients.
    Redirects callback back to the provided deep link with token/error.
    """
    state = _encode_mobile_state(redirect_uri)
    url = get_auth_url(state)
    if not url:
        raise HTTPException(
            status_code=500,
            detail="credentials.json not found. Please set up Google Cloud OAuth2 credentials.",
        )
    return RedirectResponse(url=url)


@router.get("/google-connect")
def google_auth_connect(current_user: User = Depends(get_current_user)):
    """
    Start Google OAuth2 flow for EXISTING LOGGED-IN USER.
    Use this in Settings page - user already has JWT.
    State param: user_id of current user.
    """
    url = get_auth_url(str(current_user.id))
    if not url:
        raise HTTPException(
            status_code=500,
            detail="credentials.json not found. Please set up Google Cloud OAuth2 credentials."
        )
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(
    code: str = None, 
    error: str = None, 
    state: str = None,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth2 callback.
    - If state='new': Login flow (create/find user, save tokens, return JWT)
    - If state=user_id: Connect services to existing user
    """
    if not code or not state:
        raise HTTPException(status_code=400, detail="No authorization code or state received")

    mobile_state = _decode_mobile_state(state)

    if error:
        if mobile_state and mobile_state.get("redirect_uri"):
            return RedirectResponse(url=_append_query(mobile_state["redirect_uri"], {"error": error}))
        return RedirectResponse(url=_append_query(FRONTEND_LOGIN_REDIRECT, {"error": error}))

    if mobile_state and mobile_state.get("flow") == "mobile_login":
        try:
            jwt_token, email = await _handle_google_login_exchange(code, db)
            target = mobile_state.get("redirect_uri", "")
            return RedirectResponse(url=_append_query(target, {"token": jwt_token, "email": email}))
        except Exception as e:
            print(f"Mobile login flow error: {e}")
            import traceback
            traceback.print_exc()
            target = mobile_state.get("redirect_uri", "")
            return RedirectResponse(url=_append_query(target, {"error": "auth_failed"}))

    # CASE 1: New user login flow
    if state == "new":
        try:
            jwt_token, email = await _handle_google_login_exchange(code, db)
            return RedirectResponse(url=_append_query(FRONTEND_LOGIN_REDIRECT, {"token": jwt_token, "email": email}))
        except Exception as e:
            print(f"Login flow error: {e}")
            import traceback
            traceback.print_exc()
            return RedirectResponse(url=_append_query(FRONTEND_LOGIN_REDIRECT, {"error": "auth_failed"}))
    
    # CASE 2: Existing user connecting services
    else:
        try:
            from uuid import UUID
            user = db.query(User).filter(User.id == UUID(state)).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid state parameter: {e}")

        success = handle_auth_callback(code, state, user, db)
        if success:
            return RedirectResponse(url=_append_query(FRONTEND_SETTINGS_REDIRECT, {"auth": "success"}))
        else:
            raise HTTPException(status_code=500, detail="Failed to complete authentication. Check backend terminal for details.")


@router.get("/status")
def auth_status(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
):
    """Check Google service connection status without hard-failing during DB outages."""
    if not credentials:
        return {"authenticated": False, "message": "No auth token provided"}

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub") if payload else None
    if not user_id:
        return {"authenticated": False, "message": "Invalid or expired token"}

    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"authenticated": False, "message": "User not found"}

        connected = is_authenticated(user, db)
        return {
            "authenticated": connected,
            "message": "Google services connected" if connected else "Not connected to Google"
        }
    except OperationalError:
        return {
            "authenticated": False,
            "message": "Database unavailable; cannot verify Google connection right now",
            "service_unavailable": True,
        }


@router.get("/services-status")
def auth_services_status(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
):
    """Return real per-service Google connection status for the current user."""
    if not credentials:
        return {
            "authenticated": False,
            "message": "No auth token provided",
            "service_status": _empty_service_status(),
            "connected_services": [],
        }

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub") if payload else None
    if not user_id:
        return {
            "authenticated": False,
            "message": "Invalid or expired token",
            "service_status": _empty_service_status(),
            "connected_services": [],
        }

    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                "authenticated": False,
                "message": "User not found",
                "service_status": _empty_service_status(),
                "connected_services": [],
            }

        if not is_authenticated(user, db):
            return {
                "authenticated": False,
                "message": "Not connected to Google",
                "service_status": _empty_service_status(),
                "connected_services": [],
            }

        creds = get_credentials(user, db)
        if not creds:
            return {
                "authenticated": False,
                "message": "Google credentials unavailable",
                "service_status": _empty_service_status(),
                "connected_services": [],
            }

        service_status = _probe_google_service_status(creds)
        connected_services = [name for name, connected in service_status.items() if connected]
        return {
            "authenticated": True,
            "message": "Fetched live Google service status",
            "service_status": service_status,
            "connected_services": connected_services,
        }
    except OperationalError:
        return {
            "authenticated": False,
            "message": "Database unavailable; cannot verify Google connection right now",
            "service_unavailable": True,
            "service_status": _empty_service_status(),
            "connected_services": [],
        }


@router.post("/logout")
def google_logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Google services for current user."""
    logout(current_user, db)
    return {"status": "success", "message": "Google services disconnected"}
