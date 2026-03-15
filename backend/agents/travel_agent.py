"""
Travel/Maps Agent (Unified)

Supports two modes:
- plan(meetings)                  → Manual input (LLM estimates travel)
- analyze_travel(meetings, home)  → Auto-fetches real Google Maps directions
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm
from utils.google_maps import get_directions


class TravelAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/travel_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "summary": "string",
    "total_travel_time": "string",
    "travel_plan": [{{}}],
    "routes": [{{}}],
    "departure_times": ["array"],
    "optimization_tips": ["array"],
    "warnings": ["array"]
}}"""),
            ("human", """Analyze travel requirements for these meetings:
{meetings}

Route data (if available):
{routes}

Return ONLY JSON:""")
        ])

    def plan(self, meetings):
        """Plan travel from manually-provided meetings (LLM estimates)."""
        if not meetings:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            return chain.invoke({
                "meetings": json.dumps(meetings, indent=2),
                "routes": "No Google Maps data — estimate travel times"
            })
        except Exception as e:
            travel_plan = []
            for m in meetings:
                travel_plan.append({
                    "meeting": m.get("title", "Unknown"),
                    "location": m.get("location", "Unknown"),
                    "meeting_time": m.get("time", "Unknown"),
                    "recommended_departure": "15 minutes early",
                    "travel_duration": "30 minutes",
                    "notes": "Basic estimate — connect Google Maps for real data"
                })
            return {
                "summary": f"Basic travel plan for {len(meetings)} meetings",
                "total_travel_time": f"{len(meetings) * 30} min estimated",
                "travel_plan": travel_plan,
                "routes": [],
                "departure_times": [],
                "optimization_tips": [],
                "warnings": [f"Error: {str(e)}"]
            }

    def analyze_travel(self, meetings, home_location="Home"):
        """Get REAL directions from Google Maps between meeting locations."""
        if not meetings:
            return self._empty_result()

        # Get real directions between consecutive locations
        routes_data = []
        locations = [home_location] + [
            m.get("location", "") for m in meetings
            if m.get("location") and m.get("location") != "No location"
        ]

        for i in range(len(locations) - 1):
            origin = locations[i]
            dest = locations[i + 1]
            if origin and dest and origin != dest:
                try:
                    route = get_directions(origin, dest)
                    if "error" not in route:
                        routes_data.append(route)
                except Exception:
                    routes_data.append({"origin": origin, "destination": dest, "error": "Could not get directions"})

        if not routes_data:
            return {
                **self._empty_result(),
                "summary": "No travel required — all meetings virtual or same location"
            }

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({
                "meetings": json.dumps(meetings, indent=2),
                "routes": json.dumps(routes_data, indent=2)
            })
            result["raw_routes"] = routes_data
            return result
        except Exception as e:
            total_sec = sum(r.get("duration_seconds", 0) for r in routes_data if isinstance(r.get("duration_seconds"), int))
            return {
                "summary": f"Travel between {len(routes_data)} locations",
                "total_travel_time": f"{total_sec // 60} minutes",
                "travel_plan": [],
                "routes": routes_data,
                "departure_times": [],
                "optimization_tips": [],
                "warnings": [f"LLM error: {str(e)}"],
                "raw_routes": routes_data
            }

    def _empty_result(self):
        return {
            "summary": "No travel needed — no meetings scheduled.",
            "total_travel_time": "0 minutes",
            "travel_plan": [],
            "routes": [],
            "departure_times": [],
            "optimization_tips": [],
            "warnings": []
        }
