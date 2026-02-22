"""
Notes Agent

Supports two modes:
- analyze(events, tasks)          → Generate notes from manual input
- fetch_and_analyze(events, tasks) → Fetches existing notes + generates new ones
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm
from utils.google_notes import get_notes, create_note


class NotesAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/notes_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "summary": "string",
    "meeting_prep_notes": ["array"],
    "follow_up_reminders": ["array"],
    "key_notes": ["array"],
    "recommendations": ["array"]
}}"""),
            ("human", """Generate useful notes based on:

Events:
{events}

Tasks:
{tasks}

Existing notes:
{existing_notes}

Return ONLY JSON:""")
        ])

    def analyze(self, events, tasks):
        """Generate notes from manually-provided events and tasks."""
        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({
                "events": json.dumps(events, indent=2),
                "tasks": json.dumps(tasks, indent=2),
                "existing_notes": "[]"
            })
            return result
        except Exception as e:
            return {**self._empty_result(), "recommendations": [f"Error: {str(e)}"]}

    def fetch_and_analyze(self, events, tasks):
        """Fetch existing notes from Google + generate new smart notes."""
        try:
            existing_notes = get_notes()
        except Exception:
            existing_notes = []

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({
                "events": json.dumps(events, indent=2),
                "tasks": json.dumps(tasks, indent=2),
                "existing_notes": json.dumps(existing_notes, indent=2)
            })
            result["existing_notes"] = existing_notes
            return result
        except Exception as e:
            return {**self._empty_result(), "recommendations": [f"Error: {str(e)}"], "existing_notes": existing_notes}

    def save_note(self, title, content):
        """Save a note to Google Tasks Notes list."""
        try:
            return create_note(title, content)
        except Exception as e:
            return {"error": str(e)}

    def _empty_result(self):
        return {
            "summary": "No notes generated.",
            "meeting_prep_notes": [],
            "follow_up_reminders": [],
            "key_notes": [],
            "recommendations": [],
            "existing_notes": []
        }
