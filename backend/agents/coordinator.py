import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from config.settings import llm


class CoordinatorAgent:
    """
    Coordinator Agent:
    Synthesizes all agent outputs into a final user-friendly response
    """
    def __init__(self):
        self.parser = StrOutputParser()
        
        # Load prompt from file
        with open("prompts/coordinator_agent_prompt.txt", "r") as f:
            prompt_content = f.read()
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", prompt_content),
            ("human", """Here's the complete analysis of the user's day:

Calendar Analysis:
{calendar_analysis}

Task Analysis:
{task_analysis}

Conflict Detection:
{conflicts}

Travel Planning:
{travel_plan}

Optimized Plan:
{optimized_plan}

Create a friendly, actionable summary that helps the user understand their day 
and what they should focus on.""")
        ])
    
    def coordinate(self, calendar_analysis, task_analysis, conflicts, 
                   travel_plan, optimized_plan):
        chain = self.prompt | llm | self.parser
        
        try:
            return chain.invoke({
                "calendar_analysis": json.dumps(calendar_analysis, indent=2),
                "task_analysis": json.dumps(task_analysis, indent=2),
                "conflicts": json.dumps(conflicts, indent=2),
                "travel_plan": json.dumps(travel_plan, indent=2),
                "optimized_plan": json.dumps(optimized_plan, indent=2)
            })
        except Exception as e:
            # Fallback with basic coordination
            return f"""Good day! Here's your schedule summary:

📅 **Meetings**: {calendar_analysis.get('total_meetings', 'Unknown')} scheduled
📝 **Tasks**: {task_analysis.get('total_tasks', 'Unknown')} to complete
⚠️ **Conflicts**: {conflicts.get('conflict_count', 'Unknown')} detected
🚗 **Travel**: {travel_plan.get('summary', 'Check travel plan')}

**Key Focus Areas:**
- Attend all scheduled meetings
- Complete high-priority tasks
- Address any conflicts proactively

Have a productive day! (Note: Some analysis details unavailable due to error: {str(e)})"""
