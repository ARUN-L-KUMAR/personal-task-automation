"""
Google OAuth2 Authentication Router

Endpoints:
- GET  /api/auth/google          → Get OAuth URL
- GET  /api/auth/google/callback → Handle OAuth callback
- GET  /api/auth/status          → Check auth status
- POST /api/auth/logout          → Logout (remove token)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from utils.google_auth import get_auth_url, handle_auth_callback, is_authenticated, logout

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.get("/google")
def google_auth():
    """Start Google OAuth2 flow — redirects to Google login."""
    url = get_auth_url()
    if not url:
        raise HTTPException(
            status_code=500,
            detail="credentials.json not found. Please set up Google Cloud OAuth2 credentials."
        )
    return RedirectResponse(url=url)


@router.get("/google/callback")
def google_callback(code: str = None, error: str = None, scope: str = None):
    """Handle Google OAuth2 callback."""
    if error:
        return {"status": "error", "detail": f"Google auth error: {error}"}

    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")

    success = handle_auth_callback(code)
    if success:
        # Redirect to frontend after successful auth
        return RedirectResponse(url="http://localhost:3000/settings?auth=success")
    else:
        raise HTTPException(status_code=500, detail="Failed to complete authentication. Check backend terminal for details.")


@router.get("/status")
def auth_status():
    """Check if Google services are authenticated."""
    return {
        "authenticated": is_authenticated(),
        "message": "Google services connected" if is_authenticated() else "Not connected to Google"
    }


@router.post("/logout")
def google_logout():
    """Disconnect Google services."""
    logout()
    return {"status": "success", "message": "Google services disconnected"}
