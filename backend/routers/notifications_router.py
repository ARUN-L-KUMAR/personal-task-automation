"""
Mobile Push Notifications Router (Expo)

Endpoints:
  POST /api/notifications/register-device   -> Register or refresh Expo push token
  GET  /api/notifications/devices           -> List current user's registered devices
  POST /api/notifications/send-test         -> Send a test push to current user's devices
  DELETE /api/notifications/devices/{id}    -> Deactivate one device token
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import NotificationDevice, User
from middleware import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class RegisterDeviceRequest(BaseModel):
    expo_push_token: str = Field(..., min_length=10, max_length=255)
    platform: Optional[str] = Field(default="android", max_length=20)
    device_name: Optional[str] = Field(default=None, max_length=200)
    app_version: Optional[str] = Field(default=None, max_length=50)


class SendTestRequest(BaseModel):
    title: str = Field(default="Personal Task")
    body: str = Field(default="This is a test push notification")
    data: Optional[dict[str, Any]] = None


def _validate_expo_token(token: str) -> None:
    if not token.startswith("ExponentPushToken[") and not token.startswith("ExpoPushToken["):
        raise HTTPException(status_code=400, detail="Invalid Expo push token format")


def _serialize_device(device: NotificationDevice) -> dict[str, Any]:
    return {
        "id": str(device.id),
        "expo_push_token": device.expo_push_token,
        "platform": device.platform,
        "device_name": device.device_name,
        "app_version": device.app_version,
        "is_active": device.is_active,
        "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
        "created_at": device.created_at.isoformat() if device.created_at else None,
    }


async def _send_expo_push(messages: list[dict[str, Any]]) -> dict[str, Any]:
    if not messages:
        return {"sent": 0, "tickets": []}

    tickets: list[Any] = []
    sent = 0

    async with httpx.AsyncClient(timeout=20.0) as client:
        for i in range(0, len(messages), 100):
            chunk = messages[i : i + 100]
            response = await client.post(
                EXPO_PUSH_URL,
                json=chunk,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code >= 400:
                raise HTTPException(
                    status_code=502,
                    detail=f"Expo push send failed: {response.status_code} {response.text[:300]}",
                )

            payload = response.json()
            chunk_tickets = payload.get("data", [])
            tickets.extend(chunk_tickets)
            sent += len(chunk)

    return {"sent": sent, "tickets": tickets}


@router.post("/register-device")
def register_device(
    payload: RegisterDeviceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register mobile device Expo push token for the current user."""
    _validate_expo_token(payload.expo_push_token)

    device = (
        db.query(NotificationDevice)
        .filter(NotificationDevice.expo_push_token == payload.expo_push_token)
        .first()
    )

    if device:
        device.user_id = current_user.id
        device.platform = payload.platform
        device.device_name = payload.device_name
        device.app_version = payload.app_version
        device.is_active = True
        device.last_seen_at = datetime.utcnow()
    else:
        device = NotificationDevice(
            user_id=current_user.id,
            expo_push_token=payload.expo_push_token,
            platform=payload.platform,
            device_name=payload.device_name,
            app_version=payload.app_version,
            is_active=True,
            last_seen_at=datetime.utcnow(),
        )
        db.add(device)

    db.commit()
    db.refresh(device)

    return {
        "status": "registered",
        "device": _serialize_device(device),
    }


@router.get("/devices")
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    devices = (
        db.query(NotificationDevice)
        .filter(NotificationDevice.user_id == current_user.id)
        .order_by(NotificationDevice.last_seen_at.desc())
        .all()
    )
    return {"devices": [_serialize_device(d) for d in devices]}


@router.delete("/devices/{device_id}")
def deactivate_device(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = (
        db.query(NotificationDevice)
        .filter(NotificationDevice.id == device_id, NotificationDevice.user_id == current_user.id)
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device token not found")

    device.is_active = False
    device.last_seen_at = datetime.utcnow()
    db.commit()
    db.refresh(device)

    return {"status": "deactivated", "device": _serialize_device(device)}


@router.post("/send-test")
async def send_test_notification(
    payload: SendTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a test push notification to all active devices of current user."""
    devices = (
        db.query(NotificationDevice)
        .filter(NotificationDevice.user_id == current_user.id, NotificationDevice.is_active.is_(True))
        .all()
    )
    if not devices:
        return {
            "status": "no_devices",
            "sent": 0,
            "tickets": [],
            "message": "No active notification devices registered",
        }

    messages = [
        {
            "to": d.expo_push_token,
            "title": payload.title,
            "body": payload.body,
            "data": payload.data or {"source": "test"},
            "sound": "default",
            "priority": "high",
        }
        for d in devices
    ]

    result = await _send_expo_push(messages)

    return {
        "status": "sent",
        "target_devices": len(devices),
        "sent": result["sent"],
        "tickets": result["tickets"],
    }
