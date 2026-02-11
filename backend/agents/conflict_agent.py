from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Initialize LLM - Using OpenRouter
llm = ChatOpenAI(
    model="openai/gpt-4o-mini",
    temperature=0,
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1"
)

# Define State Schema for LangGraph
class ConflictState(TypedDict):
    meetings: List[dict]
    tasks: List[dict]
    time_overlaps: List[str]
    priority_conflicts: List[str]
    final_conflicts: List[str]

# Node 1: Detect Time Overlaps
def detect_time_overlaps(state: ConflictState) -> ConflictState:
    """Detect direct time overlaps between meetings and task deadlines"""
    meetings = state["meetings"]
    tasks = state["tasks"]
    
    if not meetings or not tasks:
        state["time_overlaps"] = []
        return state
    
    prompt = f"""
    Analyze these schedules for TIME CONFLICTS:
    
    Meetings:
    {meetings}
    
    Tasks:
    {tasks}
    
    Find any cases where:
    - A task deadline falls during a meeting
    - A task deadline is within 30 minutes of a meeting
    - Multiple meetings overlap
    
    List each time conflict found. If none, say "No time overlaps found."
    Be specific with times.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a precise time conflict detector. Focus only on time-based conflicts."),
        HumanMessage(content=prompt)
    ])
    
    state["time_overlaps"] = [response.content]
    return state

# Node 2: Detect Priority Conflicts
def detect_priority_conflicts(state: ConflictState) -> ConflictState:
    """Detect priority and workload conflicts"""
    meetings = state["meetings"]
    tasks = state["tasks"]
    
    prompt = f"""
    Analyze these schedules for PRIORITY/WORKLOAD issues:
    
    Meetings:
    {meetings}
    
    Tasks:
    {tasks}
    
    Find any cases where:
    - Too many high-priority items at the same time
    - Back-to-back commitments with no breaks
    - Unrealistic time to complete tasks between meetings
    
    List each priority conflict found. If none, say "No priority conflicts found."
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a workload analyst. Focus on priority and capacity issues."),
        HumanMessage(content=prompt)
    ])
    
    state["priority_conflicts"] = [response.content]
    return state

# Node 3: Synthesize All Conflicts
def synthesize_conflicts(state: ConflictState) -> ConflictState:
    """Combine all detected conflicts into a final summary"""
    
    time_overlaps = state["time_overlaps"]
    priority_conflicts = state["priority_conflicts"]
    
    # Check if no conflicts at all
    no_time_issues = any("No time overlaps" in str(t) for t in time_overlaps)
    no_priority_issues = any("No priority conflicts" in str(p) for p in priority_conflicts)
    
    if no_time_issues and no_priority_issues:
        state["final_conflicts"] = ["No conflicts detected."]
        return state
    
    prompt = f"""
    Summarize all scheduling conflicts found:
    
    Time Overlaps:
    {time_overlaps}
    
    Priority Conflicts:
    {priority_conflicts}
    
    Create a clear, numbered list of all conflicts.
    Format: "Conflict X: [description]"
    Rate each as 🔴 High, 🟡 Medium, or 🟢 Low priority.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a conflict summarizer. Be clear and actionable."),
        HumanMessage(content=prompt)
    ])
    
    state["final_conflicts"] = [response.content]
    return state

# Build the LangGraph workflow
def build_conflict_graph():
    """Construct the conflict detection graph"""
    workflow = StateGraph(ConflictState)
    
    # Add nodes
    workflow.add_node("time_check", detect_time_overlaps)
    workflow.add_node("priority_check", detect_priority_conflicts)
    workflow.add_node("synthesize", synthesize_conflicts)
    
    # Define edges (flow)
    workflow.set_entry_point("time_check")
    workflow.add_edge("time_check", "priority_check")
    workflow.add_edge("priority_check", "synthesize")
    workflow.add_edge("synthesize", END)
    
    return workflow.compile()

# Create the compiled graph
conflict_graph = build_conflict_graph()

def conflict_agent(meetings, tasks):
    """
    LangGraph-powered Conflict Detection Agent:
    Uses a multi-step workflow to detect various types of conflicts.
    
    Workflow:
    1. Detect time overlaps (meetings vs task deadlines)
    2. Detect priority conflicts (workload issues)
    3. Synthesize into final conflict report
    """
    
    # Initialize state
    initial_state: ConflictState = {
        "meetings": meetings if isinstance(meetings, list) else [],
        "tasks": tasks if isinstance(tasks, list) else [],
        "time_overlaps": [],
        "priority_conflicts": [],
        "final_conflicts": []
    }
    
    # Run the graph
    result = conflict_graph.invoke(initial_state)
    
    return result["final_conflicts"]