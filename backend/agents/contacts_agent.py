"""
Contacts Agent

Supports two modes:
- analyze(contacts, meetings) → Manual input
- fetch_and_analyze(meetings) → Auto-fetches from Google Contacts
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm
from utils.google_contacts import get_contacts


class ContactsAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/contacts_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "summary": "string",
    "meeting_contacts": [{{}}],
    "vip_contacts": ["array"],
    "missing_info": ["array"],
    "suggestions": ["array"]
}}"""),
            ("human", """Contacts:
{contacts}

Today's meetings:
{meetings}

Match attendees with contact records. Return ONLY JSON:""")
        ])

    def analyze(self, contacts, meetings):
        """Analyze manually-provided contact data against meetings."""
        if not contacts:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({
                "contacts": json.dumps(contacts[:50], indent=2),
                "meetings": json.dumps(meetings, indent=2)
            })
            return result
        except Exception as e:
            return {**self._empty_result(), "suggestions": [f"Error: {str(e)}"]}

    def fetch_and_analyze(self, meetings):
        """Auto-fetch contacts from Google and match with meeting attendees."""
        try:
            contacts = get_contacts(max_results=100)
        except Exception as e:
            return {
                **self._empty_result(),
                "summary": f"Could not fetch contacts: {str(e)}",
                "suggestions": ["Connect Google Contacts for attendee analysis"]
            }

        if not contacts:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({
                "contacts": json.dumps(contacts[:50], indent=2),
                "meetings": json.dumps(meetings, indent=2)
            })
            result["raw_contacts"] = contacts[:10]
            return result
        except Exception as e:
            return {
                "summary": f"Found {len(contacts)} contacts",
                "meeting_contacts": [],
                "vip_contacts": [],
                "missing_info": [],
                "suggestions": [f"LLM error: {str(e)}"],
                "raw_contacts": contacts[:10]
            }

    def _empty_result(self):
        return {
            "summary": "No contacts available.",
            "meeting_contacts": [],
            "vip_contacts": [],
            "missing_info": [],
            "suggestions": []
        }
