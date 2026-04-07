"""
Seed live Google account data for end-to-end testing.

Creates realistic test records via the same Google APIs used by the app:
- Calendar events (meeting scheduling)
- Google Tasks (task flow)
- Notes (stored in the AI Agent Notes task list)
- Gmail messages (sent to your own inbox by default)

Usage (run from backend/):
    python scripts/seed_google_live_data.py --email you@example.com

Optional:
    python scripts/seed_google_live_data.py --email you@example.com --recipient you@example.com --prefix "[G-ONE-E2E]"
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from typing import Any

from sqlalchemy import func

# Allow running as "python scripts/seed_google_live_data.py" from backend/.
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from database.connection import SessionLocal
from database.models import User
from utils.google_auth import get_credentials, is_authenticated
from utils.google_calendar import create_event
from utils.google_gmail import send_email
from utils.google_notes import create_note
from utils.google_tasks import create_task


IST = timezone(timedelta(hours=5, minutes=30))


@dataclass
class SeedSummary:
    calendar_created: int = 0
    tasks_created: int = 0
    notes_created: int = 0
    emails_sent: int = 0
    errors: list[str] | None = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


def _utc_rfc3339(dt: datetime) -> str:
    """Return RFC3339 UTC string expected by Google Tasks due field."""
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _find_user_by_email(db, email: str) -> User | None:
    return (
        db.query(User)
        .filter(func.lower(User.email) == email.strip().lower())
        .first()
    )


def _seed_calendar(user: User, db, prefix: str, summary: SeedSummary) -> None:
    base_date = datetime.now(IST).date() + timedelta(days=1)
    meetings = [
        {
            "summary": f"{prefix} Project Kickoff",
            "start": datetime(base_date.year, base_date.month, base_date.day, 9, 30, tzinfo=IST),
            "end": datetime(base_date.year, base_date.month, base_date.day, 10, 30, tzinfo=IST),
            "location": "College - Building 2",
            "description": "Kickoff meeting for project milestones.",
        },
        {
            "summary": f"{prefix} Client Demo",
            "start": datetime(base_date.year, base_date.month, base_date.day, 11, 15, tzinfo=IST),
            "end": datetime(base_date.year, base_date.month, base_date.day, 12, 0, tzinfo=IST),
            "location": "Downtown Office",
            "description": "Demo for client and collect feedback.",
        },
        {
            "summary": f"{prefix} Design Review",
            "start": datetime(base_date.year, base_date.month, base_date.day, 11, 45, tzinfo=IST),
            "end": datetime(base_date.year, base_date.month, base_date.day, 12, 30, tzinfo=IST),
            "location": "Virtual",
            "description": "Intentional overlap to test conflict detection.",
        },
        {
            "summary": f"{prefix} Team Sync",
            "start": datetime(base_date.year, base_date.month, base_date.day, 15, 0, tzinfo=IST),
            "end": datetime(base_date.year, base_date.month, base_date.day, 15, 45, tzinfo=IST),
            "location": "Office - Conference Room A",
            "description": "Daily sync and blockers review.",
        },
    ]

    for meeting in meetings:
        try:
            create_event(
                user,
                db,
                summary=meeting["summary"],
                start_time=meeting["start"].isoformat(),
                end_time=meeting["end"].isoformat(),
                location=meeting["location"],
                description=meeting["description"],
            )
            summary.calendar_created += 1
        except Exception as exc:
            summary.errors.append(f"calendar: {meeting['summary']} -> {exc}")


def _seed_tasks(user: User, db, prefix: str, summary: SeedSummary) -> None:
    base_date = datetime.now(IST).date() + timedelta(days=1)
    tasks = [
        {
            "title": f"{prefix} Finish assignment draft",
            "notes": "Complete sections 1 to 3 before the morning meetings.",
            "due": datetime(base_date.year, base_date.month, base_date.day, 10, 15, tzinfo=IST),
        },
        {
            "title": f"{prefix} Prepare presentation",
            "notes": "Slides for client demo and final summary slide.",
            "due": datetime(base_date.year, base_date.month, base_date.day, 13, 0, tzinfo=IST),
        },
        {
            "title": f"{prefix} Send proposal PDF",
            "notes": "Include updated pricing and timeline.",
            "due": datetime(base_date.year, base_date.month, base_date.day, 17, 30, tzinfo=IST),
        },
        {
            "title": f"{prefix} Code review pending PR",
            "notes": "Review backend PR and leave comments.",
            "due": datetime(base_date.year, base_date.month, base_date.day, 19, 0, tzinfo=IST),
        },
    ]

    for task in tasks:
        try:
            create_task(
                user,
                db,
                title=task["title"],
                notes=task["notes"],
                due=_utc_rfc3339(task["due"]),
                list_id="@default",
            )
            summary.tasks_created += 1
        except Exception as exc:
            summary.errors.append(f"task: {task['title']} -> {exc}")


def _seed_notes(user: User, db, prefix: str, summary: SeedSummary) -> None:
    notes = [
        {
            "title": f"{prefix} Daily priorities",
            "content": "1) Client demo prep 2) Assignment draft 3) Proposal send-out",
        },
        {
            "title": f"{prefix} Meeting follow-up",
            "content": "Collect action items from Project Kickoff and assign owners.",
        },
        {
            "title": f"{prefix} Risk log",
            "content": "Potential conflict between Client Demo and Design Review windows.",
        },
    ]

    for note in notes:
        try:
            create_note(user, db, title=note["title"], content=note["content"])
            summary.notes_created += 1
        except Exception as exc:
            summary.errors.append(f"note: {note['title']} -> {exc}")


def _seed_gmail(user: User, db, recipient: str, prefix: str, summary: SeedSummary) -> None:
    messages = [
        {
            "subject": f"{prefix} URGENT: Deadline updated",
            "body": "The submission deadline was moved to tomorrow 6:00 PM. Please reprioritize today's tasks.",
        },
        {
            "subject": f"{prefix} Meeting request: architecture review",
            "body": "Can we review the API architecture tomorrow at 11:30 AM? Please confirm your availability.",
        },
        {
            "subject": f"{prefix} Travel plan reminder",
            "body": "Remember to account for commute time between campus and downtown office meetings.",
        },
    ]

    for msg in messages:
        try:
            send_email(user, db, to=recipient, subject=msg["subject"], body=msg["body"])
            summary.emails_sent += 1
        except Exception as exc:
            summary.errors.append(f"gmail: {msg['subject']} -> {exc}")


def seed_google_live_data(user: User, db, args: argparse.Namespace) -> SeedSummary:
    summary = SeedSummary()

    if not args.skip_calendar:
        _seed_calendar(user, db, args.prefix, summary)
    if not args.skip_tasks:
        _seed_tasks(user, db, args.prefix, summary)
    if not args.skip_notes:
        _seed_notes(user, db, args.prefix, summary)
    if not args.skip_gmail:
        _seed_gmail(user, db, args.recipient, args.prefix, summary)

    return summary


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed Google account data for end-to-end testing (calendar, tasks, notes, gmail)."
    )
    parser.add_argument("--email", required=True, help="App user email (must already be connected to Google).")
    parser.add_argument(
        "--recipient",
        default=None,
        help="Where to send seed emails. Default: same as --email.",
    )
    parser.add_argument(
        "--prefix",
        default="[G-ONE-SEED]",
        help="Prefix added to seeded records so they are easy to find.",
    )
    parser.add_argument("--skip-calendar", action="store_true", help="Skip creating calendar events.")
    parser.add_argument("--skip-tasks", action="store_true", help="Skip creating tasks.")
    parser.add_argument("--skip-notes", action="store_true", help="Skip creating notes.")
    parser.add_argument("--skip-gmail", action="store_true", help="Skip sending Gmail messages.")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    recipient = args.recipient or args.email
    args.recipient = recipient

    db = SessionLocal()
    try:
        user = _find_user_by_email(db, args.email)
        if not user:
            print(f"ERROR: No user found for email: {args.email}")
            return 1

        if not is_authenticated(user, db):
            print("ERROR: Google is not connected for this user.")
            print("Connect Google first from the app settings, then run this script again.")
            return 1

        creds = get_credentials(user, db)
        if not creds:
            print("ERROR: Google credentials are unavailable or expired.")
            print("Reconnect Google from settings and retry.")
            return 1

        print(f"Seeding Google data for: {user.email}")
        print(f"Email recipient for seed messages: {recipient}")
        print(f"Prefix: {args.prefix}")

        summary = seed_google_live_data(user, db, args)

        print("\nSeed complete")
        print(f"- Calendar events created: {summary.calendar_created}")
        print(f"- Tasks created: {summary.tasks_created}")
        print(f"- Notes created: {summary.notes_created}")
        print(f"- Emails sent: {summary.emails_sent}")

        if summary.errors:
            print("\nSome operations failed:")
            for err in summary.errors:
                print(f"- {err}")
            return 2

        print("\nAll seed operations succeeded.")
        print("Tip: wait 10-20 seconds, then run /api/plan-day-live and /api/chatbot/context-snapshot.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
