"""
SQLAlchemy ORM Models
All tables mapped to Neon PostgreSQL.

10 Tables:
  Core:        users, projects, tasks, chat_sessions
  Integration: google_tokens, meetings
  AI:          ai_plans, agent_logs
  Personal:    user_settings
  Analytics:   productivity_metrics
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, Date, Time, Enum,
    ForeignKey, Index, Boolean, Integer, JSON,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database.connection import Base

import enum


# ────────── Enums ──────────

class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class ProjectStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


# ────────── User Model ──────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role", create_constraint=True),
        default=UserRole.USER,
        nullable=False,
    )
    is_google_user = Column(Boolean, default=False, nullable=True)
    google_access_token = Column(Text, nullable=True)   # kept temporarily
    google_refresh_token = Column(Text, nullable=True)   # kept temporarily

    # ── New identity columns ──
    google_id = Column(String(255), nullable=True)       # Google account id
    avatar_url = Column(Text, nullable=True)             # profile image
    last_login = Column(DateTime, nullable=True)         # last login time
    is_active = Column(Boolean, default=True, nullable=False)  # account active

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships — existing
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")
    chat_sessions = relationship("ChatSession", back_populates="owner", cascade="all, delete-orphan")

    # Relationships — new tables
    google_tokens = relationship("GoogleToken", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    ai_plans = relationship("AIPlan", back_populates="user", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")
    productivity_metrics = relationship("ProductivityMetric", back_populates="user", cascade="all, delete-orphan")
    saved_routes = relationship("SavedRoute", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


# ────────── Project Model ──────────

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(ProjectStatus, name="project_status", create_constraint=True),
        default=ProjectStatus.ACTIVE,
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("ix_projects_user_id", "user_id"),
        Index("ix_projects_status", "status"),
    )

    def __repr__(self):
        return f"<Project {self.title}>"


# ────────── Task Model ──────────

class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(
        Enum(TaskPriority, name="task_priority", create_constraint=True),
        default=TaskPriority.MEDIUM,
        nullable=False,
    )
    status = Column(
        Enum(TaskStatus, name="task_status", create_constraint=True),
        default=TaskStatus.TODO,
        nullable=False,
    )
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ── New planner-metadata columns ──
    estimated_duration = Column(Integer, nullable=True)   # minutes
    category = Column(String(100), nullable=True)         # e.g. work, personal
    source = Column(String(50), nullable=True)            # manual | google_tasks | email
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True
    )

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to])

    # Indexes
    __table_args__ = (
        Index("ix_tasks_project_id", "project_id"),
        Index("ix_tasks_assigned_to", "assigned_to"),
        Index("ix_tasks_status", "status"),
        Index("ix_tasks_priority", "priority"),
        Index("ix_tasks_due_date", "due_date"),
    )

    def __repr__(self):
        return f"<Task {self.title}>"


# ────────── Chat Session Model (for cross-device history) ──────────

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False, default="New Chat")
    messages = Column(JSON, nullable=False, default=list)  # Stored as JSON array
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="chat_sessions")

    # Indexes
    __table_args__ = (
        Index("ix_chat_sessions_user_id", "user_id"),
        Index("ix_chat_sessions_updated_at", "updated_at"),
    )

    def __repr__(self):
        return f"<ChatSession {self.title}>"


# ──────────────────────────────────────────────────────────────────────────────
#  NEW TABLES — Integration Layer
# ──────────────────────────────────────────────────────────────────────────────

class GoogleToken(Base):
    """Separate OAuth token storage (replaces columns on users table)."""
    __tablename__ = "google_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    scope = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="google_tokens")

    __table_args__ = (
        Index("ix_google_tokens_user_id", "user_id"),
    )

    def __repr__(self):
        return f"<GoogleToken user={self.user_id}>"


class Meeting(Base):
    """Calendar event cache — synced from Google or created manually."""
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    location = Column(Text, nullable=True)
    attendees = Column(JSONB, nullable=True)
    source = Column(String(50), default="google")        # google | manual
    last_synced_at = Column(DateTime, nullable=True)      # stale-data guard
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="meetings")

    __table_args__ = (
        Index("ix_meetings_user_id", "user_id"),
        Index("ix_meetings_start_time", "start_time"),
    )

    def __repr__(self):
        return f"<Meeting {self.title}>"


# ──────────────────────────────────────────────────────────────────────────────
#  NEW TABLES — Personalization
# ──────────────────────────────────────────────────────────────────────────────

class UserSettings(Base):
    """Planner preferences — one row per user."""
    __tablename__ = "user_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    timezone = Column(String(50), default="UTC")
    work_start = Column(Time, nullable=True)              # e.g. 09:00
    work_end = Column(Time, nullable=True)                # e.g. 18:00
    productivity_mode = Column(String(20), default="balanced")  # balanced | aggressive | relaxed
    preferences = Column(JSON, default=dict, nullable=False, server_default="{}")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="settings")

    __table_args__ = (
        Index("ix_user_settings_user_id", "user_id"),
    )

    def __repr__(self):
        return f"<UserSettings user={self.user_id}>"


# ──────────────────────────────────────────────────────────────────────────────
#  NEW TABLES — AI Persistence Layer
# ──────────────────────────────────────────────────────────────────────────────

class AIPlan(Base):
    """Stores optimized schedule plans generated by LangGraph agents."""
    __tablename__ = "ai_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_date = Column(Date, nullable=False)
    optimized_schedule = Column(JSONB, nullable=True)
    conflicts = Column(JSONB, nullable=True)
    travel_plan = Column(JSONB, nullable=True)
    productivity_score = Column(Integer, nullable=True)
    overload_risk = Column(String(20), nullable=True)     # low | medium | high

    # ── Extra metadata (per user feedback) ──
    execution_time_ms = Column(Integer, nullable=True)    # total plan generation time
    model_used = Column(String(100), nullable=True)       # LLM model name
    optimization_mode = Column(String(20), nullable=True) # balanced | aggressive | relaxed

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="ai_plans")
    agent_logs = relationship("AgentLog", back_populates="plan", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_ai_plans_user_id", "user_id"),
        Index("ix_ai_plans_plan_date", "plan_date"),
    )

    def __repr__(self):
        return f"<AIPlan {self.plan_date}>"


class AgentLog(Base):
    """Tracks individual LangGraph agent executions within a plan."""
    __tablename__ = "agent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("ai_plans.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String(100), nullable=False)      # e.g. ConflictAgent, TravelAgent
    status = Column(String(20), nullable=False)            # success | error | skipped
    execution_time_ms = Column(Integer, nullable=True)
    output = Column(JSONB, nullable=True)
    log_level = Column(String(10), default="INFO")         # DEBUG | INFO | WARN | ERROR
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plan = relationship("AIPlan", back_populates="agent_logs")

    __table_args__ = (
        Index("ix_agent_logs_plan_id", "plan_id"),
        Index("ix_agent_logs_agent_name", "agent_name"),
    )

    def __repr__(self):
        return f"<AgentLog {self.agent_name} {self.status}>"


# ──────────────────────────────────────────────────────────────────────────────
#  NEW TABLES — Analytics
# ──────────────────────────────────────────────────────────────────────────────

class ProductivityMetric(Base):
    """Daily aggregated snapshots for dashboard charts."""
    __tablename__ = "productivity_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    tasks_completed = Column(Integer, default=0)
    meetings_count = Column(Integer, default=0)
    travel_minutes = Column(Integer, default=0)
    productivity_score = Column(Integer, nullable=True)

    user = relationship("User", back_populates="productivity_metrics")

    __table_args__ = (
        Index("ix_productivity_metrics_user_id", "user_id"),
        Index("ix_productivity_metrics_date", "date"),
    )

    def __repr__(self):
        return f"<ProductivityMetric {self.date}>"


# ──────────────────────────────────────────────────────────────────────────────
#  Saved Routes (Maps)
# ──────────────────────────────────────────────────────────────────────────────

class SavedRoute(Base):
    """User-saved map routes (previously stored in localStorage)."""
    __tablename__ = "saved_routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(200), nullable=False)
    origin = Column(String(500), nullable=False)
    destination = Column(String(500), nullable=False)
    mode = Column(String(20), nullable=False, default="driving")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="saved_routes")

    __table_args__ = (
        Index("ix_saved_routes_user_id", "user_id"),
    )

    def __repr__(self):
        return f"<SavedRoute {self.label}>"
