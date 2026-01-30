import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm


class PlanningAgent:
    def __init__(self):
        self.parser = JsonOutputParser()
        
        # Load prompt from file
        with open("prompts/planning_agent_prompt.txt", "r") as f:
            prompt_content = f.read()
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text, explanations, or formatting.
The response must be parseable JSON that matches this exact structure:
{{
    "optimized_schedule": [
        {{
            "time_block": "string",
            "activity": "string",
            "type": "meeting/task/break/travel",
            "priority": "high/medium/low"
        }}
    ],
    "conflict_resolutions": ["array", "of", "strings"],
    "time_management_tips": ["array", "of", "strings"],
    "focus_areas": ["array", "of", "strings"],
    "summary": "string"
}}"""),
            ("human", """Create an optimized daily plan based on this information:

Calendar Analysis:
{calendar_analysis}

Task Analysis:
{task_analysis}

Conflicts Detected:
{conflicts}

Travel Planning:
{travel_plan}

Return ONLY JSON:""")
        ])
    
    def create_plan(self, calendar_analysis, task_analysis, conflicts, travel_plan):
        chain = self.prompt | llm | self.parser
        
        try:
            return chain.invoke({
                "calendar_analysis": json.dumps(calendar_analysis, indent=2),
                "task_analysis": json.dumps(task_analysis, indent=2),
                "conflicts": json.dumps(conflicts, indent=2),
                "travel_plan": json.dumps(travel_plan, indent=2)
            })
        except Exception as e:
            # Fallback with basic planning
            return {
                "optimized_schedule": [
                    {"time_block": "9:00-12:00", "activity": "Morning meetings and tasks", "type": "meeting", "priority": "high"},
                    {"time_block": "12:00-13:00", "activity": "Lunch break", "type": "break", "priority": "medium"},
                    {"time_block": "13:00-17:00", "activity": "Afternoon work and remaining tasks", "type": "task", "priority": "high"}
                ],
                "conflict_resolutions": ["Basic schedule created - review conflicts manually"],
                "time_management_tips": ["Take regular breaks", "Prioritize high-priority items"],
                "focus_areas": ["Complete critical tasks", "Attend all meetings"],
                "summary": f"Basic daily plan created. Error details: {str(e)}"
            }
