import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm


class TravelAgent:
    def __init__(self):
        self.parser = JsonOutputParser()
        
        # Load prompt from file
        with open("prompts/travel_agent_prompt.txt", "r") as f:
            prompt_content = f.read()
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text, explanations, or formatting.
The response must be parseable JSON with these fields: travel_plan (array), summary (string), total_travel_time (string)"""),
            ("human", """Analyze travel requirements for these meetings:
{meetings}

Return ONLY JSON:""")
        ])
    
    def plan(self, meetings):
        if not meetings:
            return {
                "travel_plan": [],
                "summary": "No travel needed - no meetings scheduled.",
                "total_travel_time": "0 minutes"
            }
        
        chain = self.prompt | llm | self.parser
        
        try:
            return chain.invoke({
                "meetings": json.dumps(meetings, indent=2)
            })
        except Exception as e:
            # Fallback with basic travel planning
            travel_plan = []
            for meeting in meetings:
                travel_plan.append({
                    "meeting": meeting.get('title', 'Unknown'),
                    "location": meeting.get('location', 'Unknown'),
                    "meeting_time": meeting.get('time', 'Unknown'),
                    "recommended_departure": "15 minutes early",
                    "travel_duration": "30 minutes",
                    "preparation_buffer": "15 minutes",
                    "notes": "Basic travel planning - check actual routes"
                })
            
            return {
                "travel_plan": travel_plan,
                "summary": f"Basic travel planning for {len(meetings)} meetings",
                "total_travel_time": f"{len(meetings) * 30} minutes estimated. Error details: {str(e)}"
            }
