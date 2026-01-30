import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm


class CalendarAgent:
    def __init__(self):
        self.parser = JsonOutputParser()
        
        # Load prompt from file
        with open("prompts/calendar_agent_prompt.txt", "r") as f:
            prompt_content = f.read()
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text, explanations, or formatting.
The response must be parseable JSON that matches this exact structure:
{{
    "summary": "string",
    "busy_periods": ["array", "of", "strings"],
    "locations": ["array", "of", "strings"],
    "total_meetings": 0,
    "insights": ["array", "of", "strings"]
}}"""),
            ("human", """Analyze these meetings:
{meetings}

Return ONLY JSON:""")
        ])
    
    def analyze(self, meetings):
        if not meetings:
            return {
                "summary": "No meetings scheduled for today.",
                "busy_periods": [],
                "locations": [],
                "total_meetings": 0,
                "insights": ["Free day with no scheduled meetings"]
            }
        
        chain = self.prompt | llm | self.parser
        
        try:
            return chain.invoke({
                "meetings": json.dumps(meetings, indent=2)
            })
        except Exception as e:
            # Fallback with basic analysis
            return {
                "summary": f"Calendar analysis completed for {len(meetings)} meetings",
                "busy_periods": ["Analysis unavailable due to parsing error"],
                "locations": list(set(m.get('location', 'Unknown') for m in meetings)),
                "total_meetings": len(meetings),
                "insights": [f"Basic analysis: {len(meetings)} meetings found", f"Error details: {str(e)}"]
            }
