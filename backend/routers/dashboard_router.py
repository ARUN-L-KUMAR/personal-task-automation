from fastapi import APIRouter, HTTPException, Depends
from utils.google_auth import is_authenticated
from utils.google_calendar import get_today_events
from utils.google_tasks import get_tasks
from utils.google_gmail import get_inbox
from utils.google_notes import get_notes
from database.connection import get_db
from database.models import Project, Task, User, ProjectStatus, TaskStatus, TaskPriority
from middleware import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import func
import asyncio
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _get_db_stats(db: Session, user: User) -> dict:
    """Compute persistent-layer stats from Neon PostgreSQL."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    total_projects = db.query(func.count(Project.id)).filter(Project.user_id == user.id).scalar() or 0
    active_projects = db.query(func.count(Project.id)).filter(
        Project.user_id == user.id, Project.status == ProjectStatus.ACTIVE
    ).scalar() or 0

    # All tasks for user (via owned projects)
    user_project_ids = db.query(Project.id).filter(Project.user_id == user.id).scalar_subquery()

    total_tasks = db.query(func.count(Task.id)).filter(Task.project_id.in_(user_project_ids)).scalar() or 0
    completed_tasks = db.query(func.count(Task.id)).filter(
        Task.project_id.in_(user_project_ids), Task.status == TaskStatus.DONE
    ).scalar() or 0
    completed_this_week = db.query(func.count(Task.id)).filter(
        Task.project_id.in_(user_project_ids),
        Task.status == TaskStatus.DONE,
        Task.created_at >= week_ago,
    ).scalar() or 0
    overdue_tasks = db.query(func.count(Task.id)).filter(
        Task.project_id.in_(user_project_ids),
        Task.status != TaskStatus.DONE,
        Task.due_date < now.date(),
    ).scalar() or 0
    in_progress = db.query(func.count(Task.id)).filter(
        Task.project_id.in_(user_project_ids), Task.status == TaskStatus.IN_PROGRESS
    ).scalar() or 0

    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    # Priority distribution
    priority_counts = dict(
        db.query(Task.priority, func.count(Task.id)).filter(
            Task.project_id.in_(user_project_ids), Task.status != TaskStatus.DONE
        ).group_by(Task.priority).all()
    )

    # Tasks per project (for bar chart)
    tasks_per_project = (
        db.query(Project.title, func.count(Task.id))
        .outerjoin(Task, Task.project_id == Project.id)
        .filter(Project.user_id == user.id)
        .group_by(Project.id, Project.title)
        .all()
    )

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "completed_this_week": completed_this_week,
        "overdue_db_tasks": overdue_tasks,
        "in_progress_tasks": in_progress,
        "completion_rate": completion_rate,
        "priority_distribution": {
            "high": priority_counts.get(TaskPriority.HIGH, 0),
            "medium": priority_counts.get(TaskPriority.MEDIUM, 0),
            "low": priority_counts.get(TaskPriority.LOW, 0),
        },
        "tasks_per_project": [{"project": title, "tasks": count} for title, count in tasks_per_project],
    }


def _priority_tone(priority: TaskPriority | None) -> str:
    if priority == TaskPriority.HIGH:
        return "danger"
    if priority == TaskPriority.MEDIUM:
        return "warning"
    if priority == TaskPriority.LOW:
        return "neutral"
    return "info"


def _get_done_today_items(db: Session, user: User) -> list[dict]:
    """Return persisted tasks completed today for the kanban Done column."""
    now = datetime.utcnow()
    start_of_day = datetime.combine(now.date(), datetime.min.time())

    done_tasks = (
        db.query(Task, Project.title)
        .join(Project, Task.project_id == Project.id)
        .filter(
            Project.user_id == user.id,
            Task.status == TaskStatus.DONE,
            Task.updated_at.isnot(None),
            Task.updated_at >= start_of_day,
        )
        .order_by(Task.updated_at.desc())
        .limit(6)
        .all()
    )

    items = []
    for task, project_title in done_tasks:
        items.append({
            "id": str(task.id),
            "title": task.title,
            "time": task.updated_at.isoformat() if task.updated_at else "",
            "duration_minutes": task.estimated_duration or 0,
            "kind": "task",
            "badge": project_title or "Completed",
            "badge_tone": "success",
            "secondary_badge": (task.priority.value.title() if task.priority else ""),
            "secondary_badge_tone": _priority_tone(task.priority),
        })
    return items


def _detect_conflicts(events: list) -> list:
    """Detect scheduling conflicts between events."""
    conflicts = []
    sorted_events = sorted(events, key=lambda e: e.get("start", ""))
    for i in range(len(sorted_events) - 1):
        try:
            end_current = datetime.fromisoformat(sorted_events[i].get("end", "").replace("Z", "+00:00"))
            start_next = datetime.fromisoformat(sorted_events[i + 1].get("start", "").replace("Z", "+00:00"))
            if end_current > start_next:
                overlap_minutes = int((end_current - start_next).total_seconds() / 60)
                conflicts.append({
                    "event_a": sorted_events[i].get("title", "Untitled"),
                    "event_b": sorted_events[i + 1].get("title", "Untitled"),
                    "overlap_minutes": overlap_minutes,
                    "severity": "high" if overlap_minutes > 30 else "medium" if overlap_minutes > 10 else "low",
                    "suggestion": f"Consider rescheduling '{sorted_events[i + 1].get('title', '')}' by {overlap_minutes} minutes."
                })
        except Exception:
            continue
    return conflicts


def _estimate_travel(events: list) -> dict:
    """Estimate travel burden from events with locations."""
    travel_events = [e for e in events if e.get("location") and e.get("location") != "No location"]
    total_travel_minutes = len(travel_events) * 25  # Estimated 25 min avg per location-based event
    longest_route = max(25, total_travel_minutes // max(len(travel_events), 1)) if travel_events else 0
    return {
        "total_minutes": total_travel_minutes,
        "travel_event_count": len(travel_events),
        "longest_route_minutes": longest_route,
        "optimization_tip": "Leave 10 minutes early for back-to-back travel." if len(travel_events) > 1 else "No travel optimization needed." if not travel_events else "Allow buffer time for travel."
    }


def _compute_productivity_score(events: list, tasks: list, pending_tasks: list, conflicts: list, travel: dict) -> int:
    """Weighted productivity score: defensible formula."""
    score = 100
    completed = len(tasks) - len(pending_tasks)
    overdue = sum(1 for t in pending_tasks if t.get("due") and t["due"] < datetime.now(timezone.utc).isoformat())
    urgent = sum(1 for t in pending_tasks if "urgent" in (t.get("title", "") + t.get("notes", "")).lower())

    score -= len(conflicts) * 15       # Conflict penalty
    score -= overdue * 10              # Overdue penalty
    score -= (travel["total_minutes"] // 60) * 5  # Travel hours penalty
    score += completed * 8             # Completed reward
    score = max(0, min(100, score))    # Clamp 0-100
    return score, overdue, urgent


def _assess_workload(events: list, pending_tasks: list) -> dict:
    """Assess workload level."""
    total_items = len(events) + len(pending_tasks)
    if total_items >= 10:
        level = "heavy"
        percentage = min(100, total_items * 8)
    elif total_items >= 5:
        level = "moderate"
        percentage = min(85, total_items * 10)
    else:
        level = "light"
        percentage = max(15, total_items * 12)
    return {"level": level, "percentage": percentage, "total_items": total_items}


def _build_optimized_schedule(events: list, pending_tasks: list, conflicts: list) -> list:
    """Build an optimized timeline from events and tasks."""
    timeline = []
    for event in sorted(events, key=lambda e: e.get("start", "")):
        entry_type = "meeting"
        if event.get("location") and event.get("location") != "No location":
            entry_type = "travel"
        # Check if event is in a conflict
        is_conflict = any(
            c["event_a"] == event.get("title") or c["event_b"] == event.get("title")
            for c in conflicts
        )
        if is_conflict:
            entry_type = "conflict"
        timeline.append({
            "time": event.get("start", ""),
            "end_time": event.get("end", ""),
            "title": event.get("title", "Untitled"),
            "type": entry_type,
            "location": event.get("location", ""),
        })
    # Add top 3 pending tasks as task blocks
    for task in pending_tasks[:3]:
        timeline.append({
            "time": "",
            "end_time": "",
            "title": task.get("title", "Untitled Task"),
            "type": "task",
            "location": "",
        })
    return timeline


def _generate_insights(events, pending_tasks, conflicts, travel, workload, productivity_score) -> list:
    """Generate strategic AI insights."""
    insights = []
    if workload["level"] == "heavy":
        insights.append({"label": "Overload Risk", "value": "High", "tone": "danger"})
    elif workload["level"] == "moderate":
        insights.append({"label": "Overload Risk", "value": "Moderate", "tone": "warning"})
    else:
        insights.append({"label": "Overload Risk", "value": "Low", "tone": "success"})

    # Focus window: find largest gap between meetings
    sorted_events = sorted(events, key=lambda e: e.get("start", ""))
    best_gap = ""
    if len(sorted_events) >= 2:
        max_gap = 0
        for i in range(len(sorted_events) - 1):
            try:
                end = datetime.fromisoformat(sorted_events[i].get("end", "").replace("Z", "+00:00"))
                start = datetime.fromisoformat(sorted_events[i + 1].get("start", "").replace("Z", "+00:00"))
                gap = (start - end).total_seconds() / 60
                if gap > max_gap:
                    max_gap = gap
                    best_gap = f"{end.strftime('%I:%M %p')} – {start.strftime('%I:%M %p')}"
            except Exception:
                continue
    insights.append({"label": "Focus Window", "value": best_gap or "No clear window", "tone": "info"})

    if pending_tasks:
        insights.append({"label": "Priority Recommendation", "value": pending_tasks[0].get("title", "Review tasks"), "tone": "info"})

    if len(events) > 4:
        insights.append({"label": "Energy Suggestion", "value": "Avoid back-to-back meetings", "tone": "warning"})
    elif len(events) <= 2:
        insights.append({"label": "Energy Suggestion", "value": "Good pace — use open time for deep work", "tone": "success"})
    else:
        insights.append({"label": "Energy Suggestion", "value": "Balanced schedule — stay focused", "tone": "info"})

    return insights


@router.get("/summary")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate real data from Google services + Neon DB for hybrid dashboard — v3."""

    # ── Layer 1: Persistent Database Stats ──
    db_stats = _get_db_stats(db, current_user)

    agent_status = {
        "calendar": "grey",
        "tasks": "grey",
        "email": "grey",
        "conflict": "grey",
        "travel": "grey",
        "planning": "grey",
    }

    if not is_authenticated(current_user, db):
        return {
            "authenticated": False,
            "agent_status": agent_status,
            "db_stats": db_stats,
            "stats": {
                "meetings": 0,
                "active_tasks": 0,
                "overdue_tasks": 0,
                "urgent_tasks": 0,
                "conflicts": 0,
                "conflict_severity": "none",
                "emails": 0,
                "productivity_score": 0,
                "travel_minutes": 0,
                "travel_events": 0,
            },
            "timeline": [],
            "done_today": [],
            "conflicts": [],
            "travel": {"total_minutes": 0, "travel_event_count": 0, "longest_route_minutes": 0, "optimization_tip": ""},
            "workload": {"level": "light", "percentage": 0, "total_items": 0},
            "task_distribution": {"urgent": 0, "today": 0, "upcoming": 0},
            "insights": [],
            "events": [],
            "tasks": [],
            "emails": [],
        }

    try:
        loop = asyncio.get_event_loop()
        calendar_task = loop.run_in_executor(None, lambda: get_today_events(current_user, db))
        tasks_task = loop.run_in_executor(None, lambda: get_tasks(current_user, db, list_id="@default"))
        emails_task = loop.run_in_executor(None, lambda: get_inbox(current_user, db, max_results=10))

        events, tasks, emails = await asyncio.gather(calendar_task, tasks_task, emails_task)
        agent_status["calendar"] = "success"
        agent_status["tasks"] = "success"
        agent_status["email"] = "success"

        # Process tasks
        pending_tasks = [t for t in tasks if t.get("status") != "completed"]
        now_iso = datetime.now(timezone.utc).isoformat()
        overdue = [t for t in pending_tasks if t.get("due") and t["due"] < now_iso]
        urgent = [t for t in pending_tasks if "urgent" in (t.get("title", "") + t.get("notes", "")).lower()]

        # Task distribution
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_tasks = [t for t in pending_tasks if t.get("due", "").startswith(today_str)]
        upcoming_tasks = [t for t in pending_tasks if t not in overdue and t not in today_tasks]
        task_distribution = {
            "urgent": len(urgent),
            "today": len(today_tasks),
            "upcoming": len(upcoming_tasks),
        }

        # Conflict detection
        conflicts = _detect_conflicts(events)
        agent_status["conflict"] = "success"
        max_severity = "none"
        if conflicts:
            severities = [c["severity"] for c in conflicts]
            if "high" in severities:
                max_severity = "high"
            elif "medium" in severities:
                max_severity = "medium"
            else:
                max_severity = "low"

        # Travel estimation
        travel = _estimate_travel(events)
        agent_status["travel"] = "success"

        # Workload
        workload = _assess_workload(events, pending_tasks)

        # Productivity score
        productivity_score, overdue_count, urgent_count = _compute_productivity_score(
            events, tasks, pending_tasks, conflicts, travel
        )

        # Optimized timeline
        timeline = _build_optimized_schedule(events, pending_tasks, conflicts)
        agent_status["planning"] = "success"

        # AI Insights
        insights = _generate_insights(events, pending_tasks, conflicts, travel, workload, productivity_score)
        done_today = _get_done_today_items(db, current_user)

        return {
            "authenticated": True,
            "agent_status": agent_status,
            "db_stats": db_stats,
            "stats": {
                "meetings": len(events),
                "active_tasks": len(pending_tasks),
                "overdue_tasks": overdue_count,
                "urgent_tasks": urgent_count,
                "conflicts": len(conflicts),
                "conflict_severity": max_severity,
                "emails": len(emails),
                "productivity_score": productivity_score,
                "travel_minutes": travel["total_minutes"],
                "travel_events": travel["travel_event_count"],
            },
            "timeline": timeline,
            "done_today": done_today,
            "conflicts": conflicts,
            "travel": travel,
            "workload": workload,
            "task_distribution": task_distribution,
            "insights": insights,
            "events": events[:5],
            "tasks": pending_tasks[:5],
            "emails": emails[:5],
        }
    except Exception as e:
        print(f"Dashboard summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
