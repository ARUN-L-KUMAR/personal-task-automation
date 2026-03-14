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

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from utils.google_auth import (
    get_auth_url, handle_auth_callback, is_authenticated, logout,
    _save_token_to_db, SCOPES, _get_client_id, _get_client_secret,
)
from database.connection import get_db
from database.models import User
from middleware import get_current_user
from services import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


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
    if error:
        return RedirectResponse(url=f"http://localhost:3000/login?error={error}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="No authorization code or state received")

    # CASE 1: New user login flow
    if state == "new":
        import httpx
        from services import hash_password
        
        # First, get user info from Google to create/find account
        try:
            # Exchange code for tokens
            from utils.google_auth import _get_client_id, _get_client_secret
            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": _get_client_id(),
                        "client_secret": _get_client_secret(),
                        "redirect_uri": "http://localhost:8000/api/auth/google/callback",
                        "grant_type": "authorization_code",
                    }
                )
                
                if token_response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
                
                tokens = token_response.json()
                access_token = tokens.get("access_token")
                refresh_token = tokens.get("refresh_token")
                expires_in = tokens.get("expires_in", 3600)
                
                # Get user info from Google
                user_response = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if user_response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to get user info from Google")
                
                userinfo = user_response.json()
                email = userinfo.get("email")
                name = userinfo.get("name", "")
                google_id = userinfo.get("sub", "")
                
                if not email:
                    raise HTTPException(status_code=400, detail="Email not provided by Google")
                
                # Find or create user
                user = db.query(User).filter(User.email == email).first()
                
                if not user:
                    # Create new user
                    from services import hash_password
                    user = User(
                        name=name or email.split("@")[0],
                        email=email,
                        password=hash_password("GOOGLE_OAUTH_" + google_id),  # Hashed placeholder
                        is_google_user=True,
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                
                # Save Google service tokens via google_tokens table
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
                
                # Generate JWT for app access
                jwt_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
                
                # Redirect to frontend with JWT
                return RedirectResponse(url=f"http://localhost:3000/login?token={jwt_token}&email={email}")
                
        except Exception as e:
            print(f"Login flow error: {e}")
            import traceback
            traceback.print_exc()
            return RedirectResponse(url=f"http://localhost:3000/login?error=auth_failed")
    
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
            return RedirectResponse(url="http://localhost:3000/settings?auth=success")
        else:
            raise HTTPException(status_code=500, detail="Failed to complete authentication. Check backend terminal for details.")


@router.get("/status")
def auth_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if current user has connected Google services."""
    return {
        "authenticated": is_authenticated(current_user, db),
        "message": "Google services connected" if is_authenticated(current_user, db) else "Not connected to Google"
    }


@router.post("/logout")
def google_logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Google services for current user."""
    logout(current_user, db)
    return {"status": "success", "message": "Google services disconnected"}
