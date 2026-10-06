"""
Conflict Agent (ReAct Tool-Use)

Uses LangChain's create_react_agent to reason iteratively with tools rather than
sending a single prompt. The LLM can call check_time_overlap and estimate_buffer_needed
multiple times, see the results, then decide whether to look deeper or conclude.

This is genuine agentic behavior — the LLM controls its own reasoning loop.
"""

import json
from datetime import datetime, time as dt_time
from typing import Optional

from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm, llm_fast  # llm_fast = Gemini 2.5 Flash (supports bind_tools)


# ── Tools available to the ConflictAgent ──────────────────────────────────────

@tool
def check_time_overlap(start_a: str, end_a: str, start_b: str, end_b: str) -> str:
    """
    Check if two time windows overlap.

    Args:
        start_a: Start time of event A in HH:MM or ISO format
        end_a:   End time of event A in HH:MM or ISO format
        start_b: Start time of event B in HH:MM or ISO format
        end_b:   End time of event B in HH:MM or ISO format

    Returns:
        JSON with 'overlap' (bool) and 'overlap_minutes' (int)
    """
    def _parse(t: str) -> Optional[dt_time]:
        for fmt in ("%H:%M", "%I:%M %p", "%H:%M:%S"):
            try:
                return datetime.strptime(t.strip(), fmt).time()
            except ValueError:
                continue
        # Try extracting time from ISO string
        try:
            return datetime.fromisoformat(t.strip().replace("Z", "+00:00")).time()
        except Exception:
            return None

    sa, ea = _parse(start_a), _parse(end_a)
    sb, eb = _parse(start_b), _parse(end_b)

    if not all([sa, ea, sb, eb]):
        return json.dumps({"overlap": False, "overlap_minutes": 0, "note": "Could not parse one or more times"})

    # Convert to minutes since midnight for arithmetic
    def _mins(t: dt_time) -> int:
        return t.hour * 60 + t.minute

    a_start, a_end = _mins(sa), _mins(ea)
    b_start, b_end = _mins(sb), _mins(eb)

    overlap_start = max(a_start, b_start)
    overlap_end   = min(a_end,   b_end)
    overlap_mins  = max(0, overlap_end - overlap_start)

    return json.dumps({
        "overlap": overlap_mins > 0,
        "overlap_minutes": overlap_mins,
    })


@tool
def estimate_buffer_needed(location_a: str, location_b: str) -> str:
    """
    Estimate the travel buffer time needed between two locations.

    Uses heuristics:
    - Same location or virtual → 0 min
    - Same city / area hint    → 15–20 min
    - Different city           → 45–60 min
    - Unknown                  → 30 min (safe default)

    Args:
        location_a: Name or address of the first location
        location_b: Name or address of the second location

    Returns:
        JSON with 'buffer_minutes' (int) and 'confidence' ('high'|'medium'|'low')
    """
    if not location_a or not location_b:
        return json.dumps({"buffer_minutes": 0, "confidence": "high", "note": "No location — virtual or same place"})

    a, b = location_a.lower().strip(), location_b.lower().strip()

    # Same location
    if a == b or a in b or b in a:
        return json.dumps({"buffer_minutes": 5, "confidence": "high", "note": "Same or overlapping location"})

    # Virtual / online markers
    virtual_markers = {"zoom", "teams", "meet", "online", "virtual", "remote", "call", "http", "https"}
    if any(m in a for m in virtual_markers) or any(m in b for m in virtual_markers):
        return json.dumps({"buffer_minutes": 0, "confidence": "high", "note": "Virtual meeting — no travel needed"})

    # Both look like the same city (share a common word > 4 chars)
    words_a = {w for w in a.split() if len(w) > 4}
    words_b = {w for w in b.split() if len(w) > 4}
    if words_a & words_b:
        return json.dumps({"buffer_minutes": 20, "confidence": "medium", "note": "Likely same city area"})

    # Different areas — assume cross-city travel
    return json.dumps({"buffer_minutes": 45, "confidence": "low", "note": "Different areas — use Google Maps for accuracy"})


# ── ConflictAgent ─────────────────────────────────────────────────────────────


class ConflictAgent:
    """
    ReAct-based conflict detection agent using LangGraph's prebuilt create_react_agent.

    The LLM uses check_time_overlap and estimate_buffer_needed tools to reason
    iteratively about scheduling conflicts before producing its JSON output.
    Falls back to a direct LCEL chain if the ReAct agent fails.
    """

    def __init__(self):
        self._tools = [check_time_overlap, estimate_buffer_needed]

        # LangGraph prebuilt ReAct agent (correct API for LangChain >=1.0 / LangGraph >=0.2)
        # Uses llm_fast (Gemini 2.5 Flash) because create_react_agent requires bind_tools support.
        # ResilientChatModel does not implement bind_tools, so it can only be used in the fallback chain.
        self._react_agent = create_react_agent(llm_fast, self._tools)

        # Fallback LCEL chain (same behavior as original agent)
        self._fallback_parser = JsonOutputParser()
        self._fallback_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a scheduling conflict detection agent.

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "has_conflicts": true,
    "conflicts": [
        {{
            "type": "time_overlap/deadline_conflict/buffer_issue",
            "severity": "high/medium/low",
            "description": "string",
            "items_involved": ["array", "of", "strings"]
        }}
    ],
    "conflict_count": 0,
    "summary": "string"
}}"""),
            ("human", """Analyze potential conflicts between these meetings and tasks:

Meetings:
{meetings}

Tasks:
{tasks}

Return ONLY JSON:""")
        ])

    def detect(self, meetings: list, tasks: list) -> dict:
        """
        Detect scheduling conflicts using ReAct reasoning with tools.

        Primary: LangGraph prebuilt ReAct agent with check_time_overlap + estimate_buffer_needed.
        Fallback: Direct LCEL chain (preserves original behavior).
        """
        meetings_str = json.dumps(meetings, indent=2)
        tasks_str    = json.dumps(tasks,    indent=2)

        user_message = f"""Analyze potential scheduling conflicts between these meetings and tasks.
Use check_time_overlap to verify time overlaps and estimate_buffer_needed for travel buffers.

Meetings:
{meetings_str}

Tasks:
{tasks_str}

After using the tools to check for conflicts, return a JSON object with this structure:
{{
    "has_conflicts": true,
    "conflicts": [
        {{
            "type": "time_overlap|deadline_conflict|buffer_issue",
            "severity": "high|medium|low",
            "description": "specific description",
            "items_involved": ["item names"]
        }}
    ],
    "conflict_count": 0,
    "summary": "brief summary"
}}"""

        # Primary: ReAct agent
        try:
            result = self._react_agent.invoke(
                {"messages": [{"role": "user", "content": user_message}]}
            )
            # Extract the last AI message content
            last_msg = result["messages"][-1]
            raw = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

            # Strip markdown code fences if the LLM wrapped the JSON
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            parsed = json.loads(raw.strip())
            parsed.setdefault("has_conflicts", bool(parsed.get("conflicts")))
            parsed.setdefault("conflict_count", len(parsed.get("conflicts", [])))
            return parsed

        except Exception as react_err:
            print(f"INFO: ConflictAgent ReAct failed ({react_err}), using fallback LCEL chain")

        # Fallback: direct LCEL chain
        try:
            chain = self._fallback_prompt | llm | self._fallback_parser
            return chain.invoke({"meetings": meetings_str, "tasks": tasks_str})

        except Exception as e:
            conflicts = []
            if meetings and tasks:
                conflicts.append({
                    "type": "potential_overlap",
                    "severity": "medium",
                    "description": "Basic analysis suggests potential scheduling conflicts",
                    "items_involved": ["Multiple meetings and tasks detected"],
                })
            return {
                "has_conflicts": bool(conflicts),
                "conflicts":     conflicts,
                "conflict_count": len(conflicts),
                "summary": f"Basic analysis completed ({len(conflicts)} potential issue(s)). Error: {str(e)}",
            }
