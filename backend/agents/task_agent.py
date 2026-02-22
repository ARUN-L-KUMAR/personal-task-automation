"""
Task Agent (Unified)

Supports two modes:
- analyze(tasks)          → Manual input (user provides tasks)
- fetch_and_analyze()     → Auto-fetches from Google Tasks
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm
from utils.google_tasks import get_tasks, get_task_lists


class TaskAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/task_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "summary": "string",
    "total_tasks": 0,
    "overdue_tasks": ["array"],
    "today_tasks": ["array"],
    "upcoming_tasks": ["array"],
    "urgent_tasks": ["array"],
    "priority_order": ["array"],
    "workload_assessment": "light/moderate/heavy",
    "recommendations": ["array"]
}}"""),
            ("human", """Analyze these tasks:
{tasks}

Return ONLY JSON:""")
        ])

    def analyze(self, tasks):
        """Analyze manually-provided tasks."""
        if not tasks:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({"tasks": json.dumps(tasks, indent=2)})
            result["raw_tasks"] = tasks
            result.setdefault("total_tasks", len(tasks))
            return result
        except Exception as e:
            return {
                "summary": f"Task analysis for {len(tasks)} tasks",
                "total_tasks": len(tasks),
                "overdue_tasks": [],
                "today_tasks": [],
                "upcoming_tasks": [],
                "urgent_tasks": [t.get("title", "") for t in tasks],
                "priority_order": [t.get("title", "") for t in tasks],
                "workload_assessment": "moderate",
                "recommendations": [f"Error: {str(e)}"],
                "raw_tasks": tasks
            }

    def fetch_and_analyze(self):
        """Auto-fetch from Google Tasks and analyze."""
        try:
            task_lists = get_task_lists()
            all_tasks = []
            for tl in task_lists:
                tasks = get_tasks(list_id=tl["id"])
                for task in tasks:
                    task["list_name"] = tl["title"]
                all_tasks.extend(tasks)
        except Exception as e:
            return {
                **self._empty_result(),
                "summary": f"Could not fetch tasks: {str(e)}",
                "recommendations": ["Connect Google Tasks to enable task analysis"]
            }

        if not all_tasks:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({"tasks": json.dumps(all_tasks, indent=2)})
            result["raw_tasks"] = all_tasks
            return result
        except Exception as e:
            return {
                "summary": f"Found {len(all_tasks)} tasks across {len(task_lists)} lists",
                "total_tasks": len(all_tasks),
                "overdue_tasks": [],
                "today_tasks": [],
                "upcoming_tasks": [],
                "urgent_tasks": [],
                "priority_order": [t.get("title", "") for t in all_tasks],
                "workload_assessment": "moderate",
                "recommendations": [f"LLM error: {str(e)}"],
                "raw_tasks": all_tasks
            }

    def _empty_result(self):
        return {
            "summary": "No tasks found.",
            "total_tasks": 0,
            "overdue_tasks": [],
            "today_tasks": [],
            "upcoming_tasks": [],
            "urgent_tasks": [],
            "priority_order": [],
            "workload_assessment": "light",
            "recommendations": ["No pending tasks — plan ahead"],
            "raw_tasks": []
        }
