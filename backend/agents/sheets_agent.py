"""
Sheets Agent

Supports two modes:
- analyze(data)                           → Manual input
- fetch_and_analyze(spreadsheet_id, range) → Auto-fetches from Google Sheets
"""

import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm
from utils.google_sheets import read_sheet


class SheetsAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/sheets_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text.
{{
    "summary": "string",
    "data_insights": ["array"],
    "patterns": ["array"],
    "recommendations": ["array"],
    "action_items": ["array"]
}}"""),
            ("human", """Analyze this spreadsheet data:

Headers: {headers}
Data rows: {data}

Return ONLY JSON:""")
        ])

    def analyze(self, sheet_data):
        """Analyze manually-provided sheet data."""
        if not sheet_data or not sheet_data.get("data"):
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({
                "headers": json.dumps(sheet_data.get("headers", [])),
                "data": json.dumps(sheet_data.get("data", [])[:50])
            })
            result["raw_data"] = sheet_data
            return result
        except Exception as e:
            return {**self._empty_result(), "recommendations": [f"Error: {str(e)}"], "raw_data": sheet_data}

    def fetch_and_analyze(self, spreadsheet_id, range_name="Sheet1"):
        """Auto-fetch from Google Sheets and analyze."""
        try:
            sheet_data = read_sheet(spreadsheet_id, range_name)
        except Exception as e:
            return {**self._empty_result(), "summary": f"Could not read sheet: {str(e)}"}

        if not sheet_data.get("data"):
            return {**self._empty_result(), "summary": "Sheet is empty", "raw_data": sheet_data}

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({
                "headers": json.dumps(sheet_data.get("headers", [])),
                "data": json.dumps(sheet_data.get("data", [])[:50])
            })
            result["raw_data"] = sheet_data
            return result
        except Exception as e:
            return {
                "summary": f"Sheet has {sheet_data.get('rows', 0)} rows",
                "data_insights": [],
                "patterns": [],
                "recommendations": [f"LLM error: {str(e)}"],
                "action_items": [],
                "raw_data": sheet_data
            }

    def _empty_result(self):
        return {
            "summary": "No sheet data available.",
            "data_insights": [],
            "patterns": [],
            "recommendations": [],
            "action_items": [],
            "raw_data": {}
        }
