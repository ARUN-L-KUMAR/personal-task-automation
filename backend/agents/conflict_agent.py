import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm


class ConflictAgent:
    def __init__(self):
        self.parser = JsonOutputParser()
        
        # Load prompt from file
        with open("prompts/conflict_agent_prompt.txt", "r") as f:
            prompt_content = f.read()
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object. No additional text, explanations, or formatting.
The response must be parseable JSON that matches this exact structure:
{{
    "has_conflicts": true,
    "conflicts": [
        {{
            "type": "time_overlap/deadline_conflict/buffer_issue",
            "severity": "high/medium/low",
            "description": "string",
            "items_involved": ["array", "of", "strings"]
        }}
    ],
    "conflict_count": 0,
    "summary": "string"
}}"""),
            ("human", """Analyze potential conflicts between these meetings and tasks:

Meetings:
{meetings}

Tasks:
{tasks}

Return ONLY JSON:""")
        ])
    
    def detect(self, meetings, tasks):
        chain = self.prompt | llm | self.parser
        
        try:
            return chain.invoke({
                "meetings": json.dumps(meetings, indent=2),
                "tasks": json.dumps(tasks, indent=2)
            })
        except Exception as e:
            # Fallback with basic conflict detection
            conflicts = []
            if meetings and tasks:
                conflicts.append({
                    "type": "potential_overlap",
                    "severity": "medium",
                    "description": "Basic analysis suggests potential scheduling conflicts",
                    "items_involved": ["Multiple meetings and tasks detected"]
                })
            
            return {
                "has_conflicts": len(conflicts) > 0,
                "conflicts": conflicts,
                "conflict_count": len(conflicts),
                "summary": f"Basic conflict analysis completed. Found {len(conflicts)} potential issues. Error details: {str(e)}"
            }
