"""
Pydantic Schemas for request validation and response serialization.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime, date, time
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
    code: str  # Google OAuth authorization code (auth-code flow)


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
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    is_active: bool = True
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
    estimated_duration: Optional[int] = None
    category: Optional[str] = None
    source: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[TaskPriorityEnum] = None
    status: Optional[TaskStatusEnum] = None
    assigned_to: Optional[UUID] = None
    due_date: Optional[date] = None
    estimated_duration: Optional[int] = None
    category: Optional[str] = None
    source: Optional[str] = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    priority: TaskPriorityEnum
    status: TaskStatusEnum
    project_id: UUID
    assigned_to: Optional[UUID]
    due_date: Optional[date]
    estimated_duration: Optional[int] = None
    category: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

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


# ────────── Google Token Schemas ──────────

class GoogleTokenCreate(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    scope: Optional[str] = None


class GoogleTokenResponse(BaseModel):
    id: UUID
    user_id: UUID
    token_expiry: Optional[datetime]
    scope: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ────────── User Settings Schemas ──────────

class UserSettingsCreate(BaseModel):
    timezone: str = "UTC"
    work_start: Optional[time] = None
    work_end: Optional[time] = None
    productivity_mode: str = "balanced"


class UserSettingsUpdate(BaseModel):
    timezone: Optional[str] = None
    work_start: Optional[time] = None
    work_end: Optional[time] = None
    productivity_mode: Optional[str] = None


class UserSettingsResponse(BaseModel):
    id: UUID
    user_id: UUID
    timezone: str
    work_start: Optional[time]
    work_end: Optional[time]
    productivity_mode: str
    created_at: datetime

    class Config:
        from_attributes = True


# ────────── AI Plan Schemas ──────────

class AIPlanCreate(BaseModel):
    plan_date: date
    optimized_schedule: Optional[Any] = None
    conflicts: Optional[Any] = None
    travel_plan: Optional[Any] = None
    productivity_score: Optional[int] = None
    overload_risk: Optional[str] = None
    execution_time_ms: Optional[int] = None
    model_used: Optional[str] = None
    optimization_mode: Optional[str] = None


class AIPlanResponse(BaseModel):
    id: UUID
    user_id: UUID
    plan_date: date
    optimized_schedule: Optional[Any]
    conflicts: Optional[Any]
    travel_plan: Optional[Any]
    productivity_score: Optional[int]
    overload_risk: Optional[str]
    execution_time_ms: Optional[int]
    model_used: Optional[str]
    optimization_mode: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ────────── Agent Log Schemas ──────────

class AgentLogCreate(BaseModel):
    plan_id: UUID
    agent_name: str
    status: str
    execution_time_ms: Optional[int] = None
    output: Optional[Any] = None
    log_level: str = "INFO"


class AgentLogResponse(BaseModel):
    id: UUID
    plan_id: UUID
    agent_name: str
    status: str
    execution_time_ms: Optional[int]
    output: Optional[Any]
    log_level: str
    created_at: datetime

    class Config:
        from_attributes = True


# ────────── Meeting Schemas ──────────

class MeetingCreate(BaseModel):
    title: str
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    attendees: Optional[Any] = None
    source: str = "google"


class MeetingResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    start_time: datetime
    end_time: Optional[datetime]
    location: Optional[str]
    attendees: Optional[Any]
    source: str
    last_synced_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ────────── Productivity Metric Schemas ──────────

class ProductivityMetricCreate(BaseModel):
    date: date
    tasks_completed: int = 0
    meetings_count: int = 0
    travel_minutes: int = 0
    productivity_score: Optional[int] = None


class ProductivityMetricResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    tasks_completed: int
    meetings_count: int
    travel_minutes: int
    productivity_score: Optional[int]

    class Config:
        from_attributes = True
