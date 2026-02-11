from langgraph.graph import StateGraph, END
from agents.graph_state import AgentState

from agents.calendar_agent import calendar_agent
from agents.task_agent import task_agent
from agents.conflict_agent import conflict_agent
from agents.travel_agent import travel_agent
from agents.planning_agent import planning_agent

# ============================================
# NODE DEFINITIONS
# Each node wraps an agent and updates state
# ============================================

def calendar_node(state: AgentState) -> AgentState:
    """
    Node 1: Calendar Agent
    Analyzes meetings and provides a schedule overview.
    """
    print("📅 Running Calendar Agent...")
    state["calendar_analysis"] = calendar_agent(state["meetings"])
    state["current_step"] = "calendar_done"
    return state


def task_node(state: AgentState) -> AgentState:
    """
    Node 2: Task Agent
    Organizes tasks by urgency and deadline.
    """
    print("📝 Running Task Agent...")
    state["task_analysis"] = task_agent(state["tasks"])
    state["current_step"] = "task_done"
    return state


def conflict_node(state: AgentState) -> AgentState:
    """
    Node 3: Conflict Agent
    Detects scheduling conflicts between meetings and tasks.
    """
    print("⚠️ Running Conflict Agent...")
    state["conflict_analysis"] = conflict_agent(
        state["meetings"], state["tasks"]
    )
    state["current_step"] = "conflict_done"
    return state


def travel_node(state: AgentState) -> AgentState:
    """
    Node 4: Travel Agent
    Generates travel reminders based on meeting locations.
    """
    print("🚗 Running Travel Agent...")
    state["travel_reminders"] = travel_agent(state["meetings"])
    state["current_step"] = "travel_done"
    return state


def planning_node(state: AgentState) -> AgentState:
    """
    Node 5: Planning Agent
    Provides AI-powered suggestions based on conflicts.
    """
    print("🧠 Running Planning Agent...")
    state["ai_suggestions"] = planning_agent(state["conflict_analysis"])
    state["current_step"] = "planning_done"
    return state


# ============================================
# BUILD THE LANGGRAPH WORKFLOW
# ============================================

def build_agent_workflow():
    """
    Creates the unified agent workflow graph.
    
    Flow:
    User Input → Calendar → Task → Conflict → Travel → Planning → Final Response
    """
    workflow = StateGraph(AgentState)
    
    # Add all nodes
    workflow.add_node("calendar", calendar_node)
    workflow.add_node("task", task_node)
    workflow.add_node("conflict", conflict_node)
    workflow.add_node("travel", travel_node)
    workflow.add_node("planning", planning_node)
    
    # Set entry point
    workflow.set_entry_point("calendar")
    
    # Define the sequential flow
    workflow.add_edge("calendar", "task")
    workflow.add_edge("task", "conflict")
    workflow.add_edge("conflict", "travel")
    workflow.add_edge("travel", "planning")
    workflow.add_edge("planning", END)  # End the workflow
    
    # Compile and return
    return workflow.compile()


# Create the compiled graph (singleton)
agent_app = build_agent_workflow()


# ============================================
# HELPER FUNCTION TO RUN THE WORKFLOW
# ============================================

def run_workflow(meetings: list, tasks: list) -> dict:
    """
    Convenience function to run the full workflow.
    
    Args:
        meetings: List of meeting dictionaries
        tasks: List of task dictionaries
    
    Returns:
        Dictionary with all agent outputs
    """
    initial_state: AgentState = {
        "meetings": meetings,
        "tasks": tasks,
        "calendar_analysis": "",
        "task_analysis": "",
        "conflict_analysis": [],
        "travel_reminders": "",
        "ai_suggestions": "",
        "current_step": "start",
        "errors": []
    }
    
    result = agent_app.invoke(initial_state)
    
    return {
        "calendar_analysis": result["calendar_analysis"],
        "task_analysis": result["task_analysis"],
        "conflict_analysis": result["conflict_analysis"],
        "travel_reminders": result["travel_reminders"],
        "ai_suggestions": result["ai_suggestions"]
    }