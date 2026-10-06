"""
Planning Agent (ReAct Tool-Use)

Uses LangChain's create_react_agent with scheduling tools so the LLM can
actively query free slots and score task priorities before producing a plan.

This makes the planning step genuinely interactive — the LLM builds the schedule
by calling tools, rather than just receiving a wall of JSON and generating output.
"""

import json
from datetime import datetime, time as dt_time, timedelta
from typing import Optional

from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm, llm_fast  # llm_fast = Gemini 2.5 Flash (supports bind_tools)


# ── Tools available to the PlanningAgent ──────────────────────────────────────

@tool
def find_free_slots(events_json: str, duration_minutes: int) -> str:
    """
    Find available time slots of a given duration in a calendar.

    Args:
        events_json:      JSON array of events with 'start' and 'end' fields (HH:MM or ISO)
        duration_minutes: Required slot length in minutes (e.g. 30, 60, 90)

    Returns:
        JSON with 'free_slots' (list of {"start": "HH:MM", "end": "HH:MM"})
    """
    try:
        events = json.loads(events_json)
    except Exception:
        return json.dumps({"free_slots": [], "error": "Could not parse events_json"})

    def _to_mins(t: str) -> Optional[int]:
        for fmt in ("%H:%M", "%H:%M:%S"):
            try:
                d = datetime.strptime(t.strip(), fmt)
                return d.hour * 60 + d.minute
            except ValueError:
                continue
        try:
            d = datetime.fromisoformat(t.strip().replace("Z", "+00:00"))
            return d.hour * 60 + d.minute
        except Exception:
            return None

    # Build list of busy intervals in minutes from midnight
    busy = []
    for e in events:
        s = _to_mins(str(e.get("start", e.get("startTime", ""))))
        en = _to_mins(str(e.get("end", e.get("endTime", ""))))
        if s is not None and en is not None and en > s:
            busy.append((s, en))

    busy.sort()

    # Working day: 08:00 – 20:00 (480 – 1200 mins)
    work_start, work_end = 480, 1200
    free_slots = []
    cursor = work_start

    for (b_start, b_end) in busy:
        if cursor + duration_minutes <= b_start:
            free_slots.append({
                "start": f"{cursor // 60:02d}:{cursor % 60:02d}",
                "end":   f"{b_start // 60:02d}:{b_start % 60:02d}",
            })
        cursor = max(cursor, b_end)

    # Check remaining time after last event
    if cursor + duration_minutes <= work_end:
        free_slots.append({
            "start": f"{cursor // 60:02d}:{cursor % 60:02d}",
            "end":   f"{work_end // 60:02d}:{work_end % 60:02d}",
        })

    return json.dumps({
        "free_slots":    free_slots,
        "total_found":   len(free_slots),
        "duration_mins": duration_minutes,
    })


@tool
def score_task_priority(title: str, deadline: str, estimated_duration_minutes: int) -> str:
    """
    Score a task's scheduling priority using an urgency × effort heuristic.

    Args:
        title:                      Task title/name
        deadline:                   Deadline string (ISO date, "today", "tomorrow", or empty)
        estimated_duration_minutes: How long the task is expected to take

    Returns:
        JSON with 'score' (0-100), 'priority' ('critical'|'high'|'medium'|'low'),
        'schedule_today' (bool), and 'rationale' (str)
    """
    score = 50  # Neutral baseline

    # Urgency factor — how soon is the deadline?
    now = datetime.now()
    deadline_lower = deadline.lower().strip() if deadline else ""

    if deadline_lower in ("today", "now"):
        score += 40
    elif deadline_lower == "tomorrow":
        score += 25
    elif deadline_lower:
        try:
            dl = datetime.fromisoformat(deadline_lower.replace("Z", ""))
            days_until = (dl.date() - now.date()).days
            if days_until <= 0:
                score += 40   # Overdue
            elif days_until == 1:
                score += 25
            elif days_until <= 3:
                score += 15
            elif days_until <= 7:
                score += 5
            else:
                score -= 10   # Far future
        except Exception:
            pass  # Unknown deadline format — neutral

    # Effort factor — longer tasks get slightly higher priority to start early
    if estimated_duration_minutes >= 120:
        score += 10  # Long task — start early
    elif estimated_duration_minutes <= 15:
        score -= 5   # Quick task — can be done later

    # Keywords that signal urgency
    urgent_keywords = {"urgent", "asap", "critical", "deadline", "overdue", "important", "must"}
    if any(k in title.lower() for k in urgent_keywords):
        score += 15

    score = max(0, min(100, score))

    if score >= 80:
        priority, schedule_today = "critical", True
    elif score >= 60:
        priority, schedule_today = "high", True
    elif score >= 40:
        priority, schedule_today = "medium", True
    else:
        priority, schedule_today = "low", False

    return json.dumps({
        "score":          score,
        "priority":       priority,
        "schedule_today": schedule_today,
        "rationale":      f"Score {score}/100 — urgency + effort heuristic",
    })


# ── PlanningAgent ─────────────────────────────────────────────────────────────


class PlanningAgent:
    """
    ReAct-based schedule optimization agent using LangGraph's prebuilt create_react_agent.

    Uses find_free_slots and score_task_priority tools to actively build the daily
    schedule rather than just reasoning from raw JSON in a single prompt.
    Falls back to a direct LCEL chain if the ReAct agent fails.
    """

    def __init__(self):
        self._tools = [find_free_slots, score_task_priority]

        # LangGraph prebuilt ReAct agent
        # Uses llm_fast (Gemini 2.5 Flash) because create_react_agent requires bind_tools support.
        # ResilientChatModel does not implement bind_tools, so it can only be used in the fallback chain.
        self._react_agent = create_react_agent(llm_fast, self._tools)

        # Fallback LCEL chain
        self._fallback_parser = JsonOutputParser()

        with open("prompts/planning_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self._fallback_prompt = ChatPromptTemplate.from_messages([
            ("system", prompt_content + """

CRITICAL: Return ONLY a valid JSON object.
{{
    "optimized_schedule": [
        {{
            "time_block": "string",
            "activity": "string",
            "type": "meeting/task/break/travel",
            "priority": "high/medium/low"
        }}
    ],
    "conflict_resolutions": ["array"],
    "time_management_tips": ["array"],
    "focus_areas": ["array"],
    "summary": "string"
}}"""),
            ("human", """Create an optimized daily plan based on this information:

Calendar Analysis: {calendar_analysis}
Task Analysis: {task_analysis}
Conflicts Detected: {conflicts}
Travel Planning: {travel_plan}
Resolution Plan: {resolution_plan}

Return ONLY JSON:""")
        ])

    def create_plan(
        self,
        calendar_analysis: dict,
        task_analysis: dict,
        conflicts: dict,
        travel_plan: dict,
        resolution_plan: Optional[dict] = None,
    ) -> dict:
        """
        Create an optimized daily plan.

        Primary: LangGraph prebuilt ReAct agent with find_free_slots + score_task_priority tools.
        Fallback: Direct LCEL chain (preserves original behavior).

        Args:
            resolution_plan: Optional output of ConflictResolutionAgent.
                             Present when graph routed through resolve_conflicts node.
                             None in conflict-free runs (fast path).
        """
        cal_str    = json.dumps(calendar_analysis, indent=2)
        task_str   = json.dumps(task_analysis,    indent=2)
        conf_str   = json.dumps(conflicts,         indent=2)
        travel_str = json.dumps(travel_plan,       indent=2)
        res_str    = json.dumps(resolution_plan or {}, indent=2)

        user_message = f"""Create an optimized daily schedule.
Use find_free_slots to identify available time windows and score_task_priority to prioritize tasks.

Calendar Analysis: {cal_str}
Task Analysis: {task_str}
Conflicts: {conf_str}
Travel Plan: {travel_str}
Resolution Plan: {res_str}

After using the tools, return a JSON object with this structure:
{{
    "optimized_schedule": [
        {{"time_block": "HH:MM-HH:MM", "activity": "string", "type": "meeting|task|break|travel", "priority": "high|medium|low"}}
    ],
    "conflict_resolutions": ["array of resolution notes"],
    "time_management_tips": ["array of tips"],
    "focus_areas": ["array of focus areas"],
    "summary": "brief summary of the day"
}}"""

        # Primary: ReAct agent
        try:
            result = self._react_agent.invoke(
                {"messages": [{"role": "user", "content": user_message}]}
            )
            last_msg = result["messages"][-1]
            raw = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            return json.loads(raw.strip())

        except Exception as react_err:
            print(f"INFO: PlanningAgent ReAct failed ({react_err}), using fallback LCEL chain")

        # Fallback: direct LCEL chain
        try:
            chain = self._fallback_prompt | llm | self._fallback_parser
            return chain.invoke({
                "calendar_analysis": cal_str,
                "task_analysis":     task_str,
                "conflicts":         conf_str,
                "travel_plan":       travel_str,
                "resolution_plan":   res_str,
            })
        except Exception as e:
            return {
                "optimized_schedule": [
                    {"time_block": "09:00-12:00", "activity": "Morning meetings and tasks", "type": "meeting", "priority": "high"},
                    {"time_block": "12:00-13:00", "activity": "Lunch break", "type": "break", "priority": "medium"},
                    {"time_block": "13:00-17:00", "activity": "Afternoon work and remaining tasks", "type": "task", "priority": "high"},
                ],
                "conflict_resolutions": ["Review conflicts manually"],
                "time_management_tips": ["Take regular breaks", "Prioritize high-priority items"],
                "focus_areas": ["Complete critical tasks", "Attend all meetings"],
                "summary": f"Basic daily plan. Error: {str(e)}",
            }
