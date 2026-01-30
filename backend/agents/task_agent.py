import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm


class TaskAgent:
    def __init__(self):
        self.parser = JsonOutputParser()
        
        # Load prompt from file
        with open("prompts/task_agent_prompt.txt", "r") as f:
            prompt_content = f.read()
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text, explanations, or formatting.
The response must be parseable JSON that matches this exact structure:
{{
    "summary": "string",
    "urgent_tasks": ["array", "of", "strings"],
    "priority_order": ["array", "of", "strings"],
    "total_tasks": 0,
    "workload_assessment": "light/moderate/heavy",
    "recommendations": ["array", "of", "strings"]
}}"""),
            ("human", """Analyze these tasks:
{tasks}

Current date/time context: {current_context}

Return ONLY JSON:""")
        ])
    
    def analyze(self, tasks, current_context="Today"):
        if not tasks:
            return {
                "summary": "No tasks scheduled.",
                "urgent_tasks": [],
                "priority_order": [],
                "total_tasks": 0,
                "workload_assessment": "light",
                "recommendations": ["No pending tasks - consider planning ahead"]
            }
        
        chain = self.prompt | llm | self.parser
        
        try:
            return chain.invoke({
                "tasks": json.dumps(tasks, indent=2),
                "current_context": current_context
            })
        except Exception as e:
            # Fallback with basic analysis
            return {
                "summary": f"Task analysis completed for {len(tasks)} tasks",
                "urgent_tasks": [t.get('title', 'Unknown') for t in tasks if 'urgent' in t.get('priority', '').lower()],
                "priority_order": [t.get('title', 'Unknown') for t in tasks],
                "total_tasks": len(tasks),
                "workload_assessment": "moderate",
                "recommendations": [f"Basic analysis: {len(tasks)} tasks found", f"Error details: {str(e)}"]
            }
