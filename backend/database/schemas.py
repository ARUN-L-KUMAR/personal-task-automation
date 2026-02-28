"""
Pydantic Schemas for request validation and response serialization.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


# ────────── Enums ──────────

class UserRoleEnum(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class ProjectStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class TaskPriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskStatusEnum(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


# ────────── Auth Schemas ──────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class GoogleLoginRequest(BaseModel):
    token: str  # Google OAuth access_token


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: UserRoleEnum
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


# ────────── Project Schemas ──────────

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: ProjectStatusEnum = ProjectStatusEnum.ACTIVE


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[ProjectStatusEnum] = None


class ProjectResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    status: ProjectStatusEnum
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectWithTasks(ProjectResponse):
    tasks: List["TaskResponse"] = []


# ────────── Task Schemas ──────────

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    status: TaskStatusEnum = TaskStatusEnum.TODO
    project_id: UUID
    assigned_to: Optional[UUID] = None
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[TaskPriorityEnum] = None
    status: Optional[TaskStatusEnum] = None
    assigned_to: Optional[UUID] = None
    due_date: Optional[date] = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    priority: TaskPriorityEnum
    status: TaskStatusEnum
    project_id: UUID
    assigned_to: Optional[UUID]
    due_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ────────── Generic API Response ──────────

class APIResponse(BaseModel):
    """Standardized API response wrapper."""
    success: bool = True
    message: str = "OK"
    data: Optional[dict | list] = None


# Resolve forward references
ProjectWithTasks.model_rebuild()
