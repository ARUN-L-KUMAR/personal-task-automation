"""
Database Tasks CRUD Router (PostgreSQL / Neon)

Endpoints:
  GET    /api/db-tasks          → List tasks (filter by project, status, priority)
  POST   /api/db-tasks          → Create a task
  GET    /api/db-tasks/{id}     → Get task detail
  PUT    /api/db-tasks/{id}     → Update a task
  DELETE /api/db-tasks/{id}     → Delete a task
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.connection import get_db
from database.models import Task, Project, User
from database.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskStatusEnum,
    TaskPriorityEnum,
)
from middleware import get_current_user

router = APIRouter(prefix="/db-tasks", tags=["Database Tasks"])


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    project_id: Optional[UUID] = Query(None),
    status_filter: Optional[TaskStatusEnum] = Query(None, alias="status"),
    priority_filter: Optional[TaskPriorityEnum] = Query(None, alias="priority"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tasks — optionally filter by project, status, or priority."""
    # Only show tasks from projects the user owns, or tasks assigned to the user
    query = (
        db.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(
            (Project.user_id == current_user.id) | (Task.assigned_to == current_user.id)
        )
    )

    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status_filter:
        query = query.filter(Task.status == status_filter.value)
    if priority_filter:
        query = query.filter(Task.priority == priority_filter.value)

    tasks = (
        query.order_by(Task.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return tasks


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new task under a project."""
    # Verify the project exists and belongs to the user
    project = (
        db.query(Project)
        .filter(Project.id == payload.project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by you")

    task = Task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority.value,
        status=payload.status.value,
        project_id=payload.project_id,
        assigned_to=payload.assigned_to or current_user.id,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single task by ID."""
    task = (
        db.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(
            Task.id == task_id,
            (Project.user_id == current_user.id) | (Task.assigned_to == current_user.id),
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a task."""
    task = (
        db.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(
            Task.id == task_id,
            (Project.user_id == current_user.id) | (Task.assigned_to == current_user.id),
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(task, field, value.value if hasattr(value, "value") else value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a task."""
    task = (
        db.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(
            Task.id == task_id,
            (Project.user_id == current_user.id) | (Task.assigned_to == current_user.id),
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
