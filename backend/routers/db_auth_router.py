"""
Database Auth Router — JWT-based Register & Login
(Separate from the existing Google OAuth router)

Endpoints:
  POST /api/db-auth/register  → Create a new user
  POST /api/db-auth/login     → Login and receive JWT
  GET  /api/db-auth/me        → Get current user profile
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
import os

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
    """Sign in (or register) with Google. Verifies Google access_token, returns JWT."""
    # Verify the access_token with Google's userinfo endpoint
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {payload.token}"},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token",
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
        # Derive unique username from name, fallback to email prefix
        base_name = name.strip() if name.strip() else email.split("@")[0]
        user = User(
            name=base_name,
            email=email,
            password="GOOGLE_OAUTH_" + google_id,  # placeholder, never used for login
            is_google_user=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
    )
