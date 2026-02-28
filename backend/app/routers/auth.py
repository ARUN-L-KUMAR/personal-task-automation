from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import models, schemas
from ..auth import get_password_hash, verify_password, create_access_token
from ..database import get_db
import httpx
import os

router = APIRouter()

# ─── Existing: Register ──────────────────────────────────────────

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already registered")

    hashed = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# ─── Existing: Login ─────────────────────────────────────────────

@router.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# ─── New: Google Login ───────────────────────────────────────────

@router.post("/google-login", response_model=schemas.Token)
async def google_login(payload: schemas.GoogleAuthRequest, db: Session = Depends(get_db)):
    # Verify the Google access token by calling Google's userinfo endpoint
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {payload.token}"}
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google token"
        )

    userinfo = response.json()
    email = userinfo.get("email")
    name = userinfo.get("name", "")
    google_id = userinfo.get("sub", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )

    # Find existing user or create a new one
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
        # Derive a unique username from email if name is blank
        base_username = name.replace(" ", "").lower() if name else email.split("@")[0]
        # Ensure username uniqueness
        username = base_username
        counter = 1
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user = models.User(
            email=email,
            username=username,
            hashed_password="GOOGLE_OAUTH_" + google_id,  # not used for password login
            is_google_user=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate our own JWT and return it
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}