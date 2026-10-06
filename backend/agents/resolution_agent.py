"""
Conflict Resolution Agent

Activated ONLY via conditional routing when ConflictAgent finds high-severity conflicts.
Proposes concrete, actionable resolutions: reschedule / delegate / drop / compress.

This is a new agent that did not exist in the original pipeline — it is only reachable
via add_conditional_edges, which is what makes the graph genuinely non-linear.
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm


class ConflictResolutionAgent:
    """
    Produces concrete resolutions for high-severity scheduling conflicts.

    Input:  conflicts dict (from ConflictAgent), calendar_analysis, task_analysis
    Output: resolution_plan dict with per-conflict resolutions
    """

    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/resolution_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", prompt_content + """

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "resolutions": [
        {{
            "conflict_description": "string",
            "severity": "high",
            "action": "reschedule|delegate|drop|compress|shift",
            "instruction": "Concrete one-sentence instruction for the user",
            "affected_item": "string",
            "new_time": "string or null"
        }}
    ],
    "rescheduled": ["array of item names moved to new times"],
    "dropped": ["array of item names removed"],
    "summary": "One sentence summary of what was resolved"
}}
"""),
            ("human", """Resolve these high-severity conflicts:

Conflicts:
{conflicts}

Calendar context:
{calendar_analysis}

Task context:
{task_analysis}

Produce concrete resolutions for EACH high-severity conflict. Return ONLY JSON:""")
        ])

    def resolve(self, conflicts: dict, calendar_analysis: dict, task_analysis: dict) -> dict:
        """
        Generate concrete resolutions for high-severity conflicts.

        Only called when the graph's conditional edge routes here.
        Returns an empty resolution plan if something fails — planning continues regardless.
        """
        # Filter to only high-severity conflicts to keep the prompt focused
        high_severity = [
            c for c in conflicts.get("conflicts", [])
            if c.get("severity") == "high"
        ]

        if not high_severity:
            return self._empty_result()

        high_severity_conflicts = {
            **conflicts,
            "conflicts": high_severity,
            "conflict_count": len(high_severity),
        }

        chain = self.prompt | llm | self.parser

        try:
            result = chain.invoke({
                "conflicts":        json.dumps(high_severity_conflicts, indent=2),
                "calendar_analysis": json.dumps(calendar_analysis, indent=2),
                "task_analysis":    json.dumps(task_analysis, indent=2),
            })
            result.setdefault("resolutions", [])
            result.setdefault("rescheduled", [])
            result.setdefault("dropped", [])
            result.setdefault("summary", f"Resolved {len(high_severity)} high-severity conflict(s)")
            return result

        except Exception as e:
            print(f"WARNING: ConflictResolutionAgent LLM call failed: {e}")
            # Graceful fallback — planning still runs with basic suggestions
            return {
                "resolutions": [
                    {
                        "conflict_description": c.get("description", "Unknown conflict"),
                        "severity": "high",
                        "action": "reschedule",
                        "instruction": "Review and manually reschedule this item",
                        "affected_item": ", ".join(c.get("items_involved", [])),
                        "new_time": None,
                    }
                    for c in high_severity
                ],
                "rescheduled": [],
                "dropped": [],
                "summary": f"Basic resolution suggestions for {len(high_severity)} conflict(s). (LLM error: {str(e)})",
            }

    def _empty_result(self) -> dict:
        return {
            "resolutions": [],
            "rescheduled": [],
            "dropped": [],
            "summary": "No high-severity conflicts to resolve.",
        }
