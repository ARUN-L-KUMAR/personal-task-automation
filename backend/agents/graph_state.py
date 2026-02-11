from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    # Input data
    meetings: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    
    # Agent outputs
    calendar_analysis: str
    task_analysis: str
    conflict_analysis: List[str]  # Changed to List to match conflict_agent output
    travel_reminders: str
    ai_suggestions: str
    
    # Workflow metadata (optional)
    current_step: Optional[str]
    errors: Optional[List[str]]