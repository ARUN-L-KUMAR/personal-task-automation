"""
Database Auth Router — JWT-based Register & Login
(Separate from the existing Google OAuth router)

Endpoints:
  POST /api/db-auth/register      → Create a new user
  POST /api/db-auth/login         → Login and receive JWT
  GET  /api/db-auth/me            → Get current user profile
  POST /api/db-auth/google-login  → Sign in with Google (stores OAuth tokens)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
import os
from google_auth_oauthlib.flow import Flow
from utils.google_auth import _save_token_to_db, _get_client_id, _get_client_secret

from database.connection import get_db
from database.models import User
from database.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleLoginRequest,
    AuthResponse,
    UserResponse,
)
from services import hash_password, verify_password, create_access_token
from middleware import get_current_user

router = APIRouter(prefix="/db-auth", tags=["Database Auth (JWT)"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with email + password."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password, receive JWT."""
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post("/google-login", response_model=AuthResponse)
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Sign in (or register) with Google. Exchanges auth code for tokens, stores them per-user."""
    # Prefer env vars in production, but fall back to credentials.json for local dev.
    client_id = os.getenv("GOOGLE_CLIENT_ID") or _get_client_id()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET") or _get_client_secret()

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured on server (set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET or provide backend/credentials.json)",
        )

    # Exchange the authorization code for access_token + refresh_token
    try:
        os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
        client_config = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["postmessage"],
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=[
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
                "https://www.googleapis.com/auth/drive.readonly",
            ],
            redirect_uri="postmessage",  # Used by @react-oauth/google auth-code flow
        )
        flow.fetch_token(code=payload.code)
        creds = flow.credentials

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to exchange Google auth code: {str(e)}",
        )


    # Fetch user info using the access token
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {creds.token}"},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to fetch user info from Google",
        )

    userinfo = response.json()
    email: str = userinfo.get("email", "")
    name: str = userinfo.get("name", "")
    google_id: str = userinfo.get("sub", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google",
        )

    # Find existing user or create a new one
    user = db.query(User).filter(User.email == email).first()

    if not user:
        base_name = name.strip() if name.strip() else email.split("@")[0]
        from services import hash_password
        user = User(
            name=base_name,
            email=email,
            password=hash_password("GOOGLE_OAUTH_" + google_id),  # Hashed placeholder
            is_google_user=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name on every login
        user.name = name.strip() if name.strip() else user.name
        user.is_google_user = True
        db.commit()
        db.refresh(user)

    # Save tokens to google_tokens table
    _save_token_to_db(user, creds, db)

    jwt_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=jwt_token,
    )
