"""
voice_router.py — Voice assistant backend endpoints.

Endpoints:
  GET  /api/voice/status  — Returns whether ElevenLabs is available (key present in env).
  GET  /api/voice/voices  — Returns available ElevenLabs voices (or empty list if no key).
  POST /api/voice/tts     — Text-to-speech via ElevenLabs. Returns audio/mpeg stream.
                            If ELEVENLABS_API_KEY is absent → HTTP 503 (frontend falls
                            back to browser speechSynthesis gracefully).

ElevenLabs is OFF by default.
To enable: add ELEVENLABS_API_KEY=<your_key> to backend/.env and restart.
Optionally set ELEVENLABS_VOICE_ID to override the default voice (Bella).
"""

import os
import requests as _requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/voice", tags=["voice"])

# ── Read config from environment ──────────────────────────────────────────────

ELEVENLABS_API_KEY  = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")  # "Sarah" default
ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"


def _key_available() -> bool:
    """Returns True only when the ElevenLabs API key is set in the environment."""
    return bool(ELEVENLABS_API_KEY and ELEVENLABS_API_KEY.strip())


# ── Models ────────────────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    speed: Optional[float] = 1.0


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
def voice_status():
    """
    Returns whether ElevenLabs premium TTS is available.
    Frontend checks this on mount to decide which TTS path to use.
    """
    return JSONResponse({
        "elevenlabs_available": _key_available(),
        "model_id": ELEVENLABS_MODEL_ID,
        "voice_id": ELEVENLABS_VOICE_ID,
    })


@router.get("/settings")
def voice_settings():
    """
    Returns active backend voice configuration so the frontend can show
    exactly which engine/model/voice is in use.
    """
    return JSONResponse({
        "engine": "elevenlabs" if _key_available() else "browser",
        "elevenlabs_available": _key_available(),
        "model_id": ELEVENLABS_MODEL_ID,
        "voice_id": ELEVENLABS_VOICE_ID,
    })


@router.get("/voices")
def voice_list():
    """
    Returns available ElevenLabs voices.
    If the API key is absent, returns an empty list with fallback=True.
    """
    if not _key_available():
        return JSONResponse({"voices": [], "fallback": True})

    try:
        resp = _requests.get(
            f"{ELEVENLABS_BASE_URL}/voices",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        voices = [
            {
                "id":          v.get("voice_id", ""),
                "name":        v.get("name", ""),
                "preview_url": v.get("preview_url", ""),
                "labels":      v.get("labels", {}),
            }
            for v in data.get("voices", [])
        ]
        return JSONResponse({"voices": voices, "fallback": False})
    except Exception as exc:
        # Network error or bad key — surface as fallback, don't crash
        return JSONResponse({"voices": [], "fallback": True, "error": str(exc)})


@router.post("/tts")
def text_to_speech(body: TTSRequest):
    """
    Converts text to speech using ElevenLabs and streams audio/mpeg.

    HTTP 503 is returned when no API key is configured — the frontend
    catches this and falls back to the browser's speechSynthesis API.
    """
    if not _key_available():
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs TTS is not configured. Add ELEVENLABS_API_KEY to .env to enable premium TTS.",
        )

    voice_id = (body.voice_id or ELEVENLABS_VOICE_ID).strip()
    # Clamp speed to ElevenLabs accepted range (0.7–1.2)
    speed = max(0.7, min(float(body.speed or 1.0), 1.2))

    payload = {
        "text": body.text,
        "model_id": ELEVENLABS_MODEL_ID,
        "voice_settings": {
            "stability":         0.5,
            "similarity_boost":  0.75,
            "style":             0.0,
            "use_speaker_boost": True,
            "speed":             speed,
        },
    }

    try:
        resp = _requests.post(
            f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}",
            headers={
                "xi-api-key":   ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept":       "audio/mpeg",
            },
            json=payload,
            stream=True,
            timeout=30,
        )
        resp.raise_for_status()
    except _requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="ElevenLabs request timed out.")
    except _requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"ElevenLabs error: {exc}")

    def _stream():
        for chunk in resp.iter_content(chunk_size=4096):
            if chunk:
                yield chunk

    return StreamingResponse(
        _stream(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
