"""
Email Agent

Supports two modes:
- analyze(emails)         → Manual input (user provides email data)
- fetch_and_analyze()     → Auto-fetches from Gmail
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm
from utils.google_gmail import get_inbox


class EmailAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/email_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "summary": "string",
    "total_emails": 0,
    "unread_count": 0,
    "urgent_emails": ["array"],
    "action_items": ["array"],
    "categories": {{}},
    "recommendations": ["array"]
}}"""),
            ("human", """Analyze these emails:
{emails}

Return ONLY JSON:""")
        ])

    def analyze(self, emails):
        """Analyze manually-provided email data."""
        if not emails:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({"emails": json.dumps(emails, indent=2)})
            result["raw_emails"] = emails
            return result
        except Exception as e:
            return {
                "summary": f"Email analysis for {len(emails)} emails",
                "total_emails": len(emails),
                "unread_count": 0,
                "urgent_emails": [],
                "action_items": [],
                "categories": {},
                "recommendations": [f"Error: {str(e)}"],
                "raw_emails": emails
            }

    def fetch_and_analyze(self, max_emails: int = 15):
        """Auto-fetch from Gmail and analyze."""
        try:
            emails = get_inbox(max_results=max_emails)
        except Exception as e:
            return {
                **self._empty_result(),
                "summary": f"Could not fetch emails: {str(e)}",
                "recommendations": ["Connect Gmail to enable email analysis"]
            }

        if not emails:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({"emails": json.dumps(emails, indent=2)})
            result["raw_emails"] = emails
            return result
        except Exception as e:
            unread = [e for e in emails if e.get("is_unread")]
            return {
                "summary": f"Inbox: {len(emails)} emails, {len(unread)} unread",
                "total_emails": len(emails),
                "unread_count": len(unread),
                "urgent_emails": [],
                "action_items": [],
                "categories": {},
                "recommendations": [f"LLM error: {str(e)}"],
                "raw_emails": emails
            }

    def _empty_result(self):
        return {
            "summary": "No recent emails.",
            "total_emails": 0,
            "unread_count": 0,
            "urgent_emails": [],
            "action_items": [],
            "categories": {},
            "recommendations": ["Inbox is clear"],
            "raw_emails": []
        }
