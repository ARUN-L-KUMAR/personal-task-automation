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
import base64
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any
from google_auth_oauthlib.flow import Flow
from pydantic import BaseModel, EmailStr, Field
from utils.google_auth import _save_token_to_db, _get_client_id, _get_client_secret, get_credentials, is_authenticated

from database.connection import get_db
from database.models import User, UserSettings
from database.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleLoginRequest,
    AuthResponse,
    UserResponse,
    VerifyRegistrationRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from services import hash_password, verify_password, create_access_token
from middleware import get_current_user

router = APIRouter(prefix="/db-auth", tags=["Database Auth (JWT)"])

ALLOWED_AVATAR_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
VERIFICATION_CODE_TTL_MINUTES = 10
EMAIL_VERIFICATION_ACTION = "email_update"
PASSWORD_VERIFICATION_ACTION = "password_update"
REGISTRATION_VERIFICATION_ACTION = "registration_verify"
PASSWORD_RESET_ACTION = "password_reset"

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")
APP_ENV = os.getenv("APP_ENV", os.getenv("ENV", "development")).lower()

# In-memory verification store keyed by "{user_id}:{action}".
# Safe for local/dev; for multi-instance production this should move to Redis/DB.
VERIFICATION_STORE: dict[str, dict[str, Any]] = {}


class AvatarDataUrlRequest(BaseModel):
    avatar_data_url: str


class AboutProfileResponse(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    google_account_email: str | None = None
    google_connected: bool


class UpdateAboutProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=30)


class SendEmailVerificationRequest(BaseModel):
    new_email: EmailStr


class VerifyEmailUpdateRequest(BaseModel):
    new_email: EmailStr
    verification_code: str = Field(..., min_length=4, max_length=12)


class VerifyPasswordUpdateRequest(BaseModel):
    current_password: str = Field(..., min_length=6, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)
    verification_code: str = Field(..., min_length=4, max_length=12)


class SendPasswordVerificationRequest(BaseModel):
    current_password: str = Field(..., min_length=6, max_length=128)


def _validate_avatar_data_url(data_url: str) -> str:
    if not data_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar image is required")

    if not data_url.startswith("data:image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar must be a valid image data URL")

    if ";base64," not in data_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar data is malformed")

    header, encoded = data_url.split(",", 1)
    mime_type = header.split(";", 1)[0][5:]
    if mime_type not in ALLOWED_AVATAR_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported avatar image type")

    try:
        raw_bytes = base64.b64decode(encoded, validate=True)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar data is corrupted")

    if len(raw_bytes) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Avatar image is too large (max 2MB)")

    return data_url


def _verification_key(user_id: str, action: str) -> str:
    return f"{user_id}:{action}"


def _issue_verification_code(user_id: str, action: str, target_email: str) -> str:
    code = f"{secrets.randbelow(1_000_000):06d}"
    key = _verification_key(user_id, action)
    VERIFICATION_STORE[key] = {
        "code": code,
        "target_email": target_email,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_TTL_MINUTES),
    }
    return code


def _consume_verification_code(user_id: str, action: str, verification_code: str, target_email: str):
    key = _verification_key(user_id, action)
    payload = VERIFICATION_STORE.get(key)
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active verification code. Request a new code.")

    expires_at: datetime = payload["expires_at"]
    if datetime.now(timezone.utc) > expires_at:
        VERIFICATION_STORE.pop(key, None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired. Request a new code.")

    if payload.get("target_email") != target_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification target mismatch. Request a new code.")

    if payload.get("code") != verification_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code.")

    VERIFICATION_STORE.pop(key, None)


def _smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD and SMTP_FROM)


def _send_verification_email(to_email: str, subject: str, body: str) -> bool:
    if not _smtp_configured():
        return False

    try:
        msg = EmailMessage()
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as exc:
        print(f"Verification email send failed: {exc}")
        return False


def _verification_send_response(code: str, delivered_via_email: bool) -> dict[str, Any]:
    response: dict[str, Any] = {
        "status": "sent",
        "expires_in_seconds": VERIFICATION_CODE_TTL_MINUTES * 60,
        "delivery": "email" if delivered_via_email else "debug",
    }

    # Local/dev fallback so feature remains testable without SMTP.
    if not delivered_via_email and APP_ENV not in {"production", "prod"}:
        response["verification_code"] = code

    return response


def _get_or_create_user_settings(user_id, db: Session) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id, preferences={})
        db.add(settings)
    return settings


async def _fetch_google_connected_email(current_user: User, db: Session) -> str | None:
    if not is_authenticated(current_user, db):
        return None

    creds = get_credentials(current_user, db)
    if not creds or not creds.token:
        return None

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {creds.token}"},
            )
        if response.status_code != 200:
            return None
        payload = response.json() or {}
        return payload.get("email")
    except Exception:
        return None


@router.post("/register", status_code=201)
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
        is_email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    code = _issue_verification_code(str(user.id), REGISTRATION_VERIFICATION_ACTION, user.email)
    delivered = _send_verification_email(
        to_email=user.email,
        subject="Welcome to G-ONE! Verify your email",
        body=(
            f"Hello {user.name},\n\n"
            f"Your registration verification code is: {code}\n\n"
            f"It expires in {VERIFICATION_CODE_TTL_MINUTES} minutes."
        ),
    )

    response = _verification_send_response(code, delivered)
    response["status"] = "verification_required"
    response["email"] = user.email
    return response


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password, receive JWT."""
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "user_not_found", "message": "No user found. Register by clicking the signup button."}
        )

    if not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_credentials", "message": "Invalid email or password"}
        )

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "unverified_email", "message": "This email is not verified yet. Please check your inbox or resend verification."}
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
    picture: str = userinfo.get("picture", "")

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
            google_id=google_id,
            avatar_url=picture or None,
            is_email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name on every login
        user.name = name.strip() if name.strip() else user.name
        user.is_google_user = True
        user.google_id = google_id or user.google_id
        if picture:
            user.avatar_url = picture
        db.commit()
        db.refresh(user)

    # Save tokens to google_tokens table
    _save_token_to_db(user, creds, db)

    jwt_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=jwt_token,
    )


@router.put("/avatar/manual", response_model=UserResponse)
def update_manual_avatar(
    payload: AvatarDataUrlRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update avatar using a manually uploaded image encoded as a data URL."""
    current_user.avatar_url = _validate_avatar_data_url(payload.avatar_data_url.strip())
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/avatar/google", response_model=UserResponse)
async def update_google_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch the current Google account profile picture and set it as avatar."""
    creds = get_credentials(current_user, db)
    if not creds or not creds.token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google not connected. Please connect your Google account first.",
        )

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {creds.token}"},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to fetch Google profile image right now.",
        )

    picture = (response.json() or {}).get("picture")
    if not picture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Google profile image found for this account.",
        )

    current_user.avatar_url = picture
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.delete("/avatar", response_model=UserResponse)
def clear_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset avatar so the UI falls back to user initials."""
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/about", response_model=AboutProfileResponse)
async def get_about_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return account/profile info used by Settings > About section."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    preferences = (settings.preferences or {}) if settings else {}
    phone = preferences.get("phone_number") if isinstance(preferences, dict) else None

    google_connected = is_authenticated(current_user, db)
    google_account_email = await _fetch_google_connected_email(current_user, db) if google_connected else None

    return AboutProfileResponse(
        name=current_user.name,
        email=current_user.email,
        phone=phone,
        google_account_email=google_account_email,
        google_connected=google_connected,
    )


@router.put("/about/profile", response_model=UserResponse)
def update_about_profile(
    payload: UpdateAboutProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update editable profile attributes (name and phone)."""
    if payload.name is None and payload.phone is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update")

    if payload.name is not None:
        current_user.name = payload.name.strip()

    if payload.phone is not None:
        settings = _get_or_create_user_settings(current_user.id, db)
        prefs = settings.preferences if isinstance(settings.preferences, dict) else {}
        phone_value = payload.phone.strip()
        if phone_value:
            prefs["phone_number"] = phone_value
        else:
            prefs.pop("phone_number", None)
        settings.preferences = prefs

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/about/email/send-code")
def send_email_update_code(
    payload: SendEmailVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a verification code to the requested new email before saving."""
    new_email = payload.new_email.strip().lower()
    if new_email == current_user.email.strip().lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New email must be different from current email")

    existing = db.query(User).filter(User.email == new_email).first()
    if existing and str(existing.id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    code = _issue_verification_code(str(current_user.id), EMAIL_VERIFICATION_ACTION, new_email)
    delivered = _send_verification_email(
        to_email=new_email,
        subject="Verify your new email",
        body=(
            f"Your verification code is: {code}\n\n"
            f"It expires in {VERIFICATION_CODE_TTL_MINUTES} minutes."
        ),
    )

    return _verification_send_response(code, delivered)


@router.put("/about/email/verify-and-save", response_model=UserResponse)
def verify_and_update_email(
    payload: VerifyEmailUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify code and update login email."""
    new_email = payload.new_email.strip().lower()

    existing = db.query(User).filter(User.email == new_email).first()
    if existing and str(existing.id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    _consume_verification_code(
        str(current_user.id),
        EMAIL_VERIFICATION_ACTION,
        payload.verification_code.strip(),
        new_email,
    )

    current_user.email = new_email
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/about/password/send-code")
def send_password_update_code(
    payload: SendPasswordVerificationRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a password-change verification code to the current login email."""
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    target_email = current_user.email.strip().lower()
    code = _issue_verification_code(str(current_user.id), PASSWORD_VERIFICATION_ACTION, target_email)
    delivered = _send_verification_email(
        to_email=target_email,
        subject="Verify your password change",
        body=(
            f"Your verification code is: {code}\n\n"
            f"It expires in {VERIFICATION_CODE_TTL_MINUTES} minutes."
        ),
    )

    return _verification_send_response(code, delivered)


@router.put("/about/password/verify-and-save")
def verify_and_update_password(
    payload: VerifyPasswordUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify code and update password."""
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    target_email = current_user.email.strip().lower()
    _consume_verification_code(
        str(current_user.id),
        PASSWORD_VERIFICATION_ACTION,
        payload.verification_code.strip(),
        target_email,
    )

    if verify_password(payload.new_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from current password")

    current_user.password = hash_password(payload.new_password)
    db.commit()

    return {"status": "success", "message": "Password updated successfully"}


@router.post("/verify-registration-email", response_model=AuthResponse)
def verify_registration_email(payload: VerifyRegistrationRequest, db: Session = Depends(get_db)):
    """Verify registration code and login the user."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")

    _consume_verification_code(
        str(user.id),
        REGISTRATION_VERIFICATION_ACTION,
        payload.verification_code.strip(),
        user.email,
    )

    user.is_email_verified = True
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
    )


@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Resend registration verification code."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")

    code = _issue_verification_code(str(user.id), REGISTRATION_VERIFICATION_ACTION, user.email)
    delivered = _send_verification_email(
        to_email=user.email,
        subject="Your new verification code",
        body=(
            f"Hello {user.name},\n\n"
            f"Your new verification code is: {code}\n\n"
            f"It expires in {VERIFICATION_CODE_TTL_MINUTES} minutes."
        ),
    )

    return _verification_send_response(code, delivered)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send a password reset code to the user."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user found with this email")

    code = _issue_verification_code(str(user.id), PASSWORD_RESET_ACTION, user.email)
    delivered = _send_verification_email(
        to_email=user.email,
        subject="Password Reset Request",
        body=(
            f"Hello {user.name},\n\n"
            f"You requested a password reset. Your verification code is: {code}\n\n"
            f"If you did not request this, please ignore this email.\n"
            f"It expires in {VERIFICATION_CODE_TTL_MINUTES} minutes."
        ),
    )

    return _verification_send_response(code, delivered)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify reset code and update password."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    _consume_verification_code(
        str(user.id),
        PASSWORD_RESET_ACTION,
        payload.verification_code.strip(),
        user.email,
    )

    user.password = hash_password(payload.new_password)
    db.commit()

    return {"status": "success", "message": "Password reset successfully"}

