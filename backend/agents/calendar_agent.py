"""
Calendar Agent (Unified)

Supports two modes:
- analyze(meetings)       → Manual input (user provides meetings)
- fetch_and_analyze()     → Auto-fetches from Google Calendar
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm
from utils.google_calendar import get_today_events


class CalendarAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/calendar_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "summary": "string",
    "total_events": 0,
    "busy_periods": ["array"],
    "free_slots": ["array"],
    "locations": ["array"],
    "insights": ["array"],
    "attendees_summary": "string"
}}"""),
            ("human", """Analyze these calendar events:
{events}

Return ONLY JSON:""")
        ])

    def analyze(self, meetings):
        """Analyze manually-provided meetings."""
        if not meetings:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({"events": json.dumps(meetings, indent=2)})
            result["raw_events"] = meetings
            result.setdefault("total_events", len(meetings))
            return result
        except Exception as e:
            return {
                "summary": f"Calendar analysis for {len(meetings)} meetings",
                "total_events": len(meetings),
                "busy_periods": [m.get("time", "") for m in meetings],
                "free_slots": [],
                "locations": list(set(m.get("location", "Unknown") for m in meetings)),
                "insights": [f"Error: {str(e)}"],
                "attendees_summary": "See raw events",
                "raw_events": meetings
            }

    def fetch_and_analyze(self):
        """Auto-fetch from Google Calendar and analyze."""
        try:
            events = get_today_events()
        except Exception as e:
            return {
                **self._empty_result(),
                "summary": f"Could not fetch calendar: {str(e)}",
                "insights": ["Google Calendar not connected or error occurred"]
            }

        if not events:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({"events": json.dumps(events, indent=2)})
            result["raw_events"] = events
            return result
        except Exception as e:
            return {
                "summary": f"Calendar analysis for {len(events)} events",
                "total_events": len(events),
                "busy_periods": [f"{e['start']} - {e['end']}" for e in events],
                "free_slots": [],
                "locations": list(set(e.get("location", "") for e in events)),
                "insights": [f"LLM error: {str(e)}"],
                "attendees_summary": "See raw events",
                "raw_events": events
            }

    def _empty_result(self):
        return {
            "summary": "No events scheduled for today.",
            "total_events": 0,
            "busy_periods": [],
            "free_slots": ["Entire day is free"],
            "locations": [],
            "insights": ["Free day — great for deep work"],
            "attendees_summary": "No meetings today",
            "raw_events": []
        }
