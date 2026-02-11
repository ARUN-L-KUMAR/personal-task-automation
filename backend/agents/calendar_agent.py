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
class CalendarState(TypedDict):
    meetings: List[dict]
    parsed_schedule: str
    priorities: str
    final_summary: str

# Node 1: Parse and Organize Schedule
def parse_schedule(state: CalendarState) -> CalendarState:
    """Parse meetings and organize them chronologically"""
    meetings = state["meetings"]
    
    if not meetings:
        state["parsed_schedule"] = "No meetings scheduled for today."
        return state
    
    prompt = f"""
    Organize these meetings chronologically:
    
    {meetings}
    
    Format each as:
    🕐 [TIME] - [TITLE]
       📍 [LOCATION]
    
    Sort by time from earliest to latest.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a calendar organizer. Be precise with times."),
        HumanMessage(content=prompt)
    ])
    
    state["parsed_schedule"] = response.content
    return state

# Node 2: Identify Priorities
def identify_priorities(state: CalendarState) -> CalendarState:
    """Identify which meetings are high priority"""
    meetings = state["meetings"]
    parsed_schedule = state["parsed_schedule"]
    
    if "No meetings" in parsed_schedule:
        state["priorities"] = "No priorities to assess."
        return state
    
    prompt = f"""
    Analyze these meetings for priority:
    
    {meetings}
    
    Identify:
    - 🔴 HIGH PRIORITY: Client meetings, deadlines, important presentations
    - 🟡 MEDIUM PRIORITY: Team meetings, regular syncs
    - 🟢 LOW PRIORITY: Optional, informal, can be rescheduled
    
    Format: "[Meeting title]: [Priority level] - [Why]"
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a priority analyst. Judge importance based on typical business context."),
        HumanMessage(content=prompt)
    ])
    
    state["priorities"] = response.content
    return state

# Node 3: Generate Final Summary
def generate_summary(state: CalendarState) -> CalendarState:
    """Create a friendly, actionable calendar summary"""
    parsed_schedule = state["parsed_schedule"]
    priorities = state["priorities"]
    
    if "No meetings" in parsed_schedule:
        state["final_summary"] = "📅 **Your Calendar is Clear!**\n\nNo meetings scheduled. Great time to focus on deep work! 🎯"
        return state
    
    prompt = f"""
    Create a friendly calendar summary:
    
    Schedule:
    {parsed_schedule}
    
    Priorities:
    {priorities}
    
    Format:
    📅 **Today's Schedule Overview**
    
    [Organized timeline of meetings]
    
    ⚡ **Key Focus:**
    - [Most important meeting to prepare for]
    
    💡 **Quick Tips:**
    - [1-2 preparation tips based on the meetings]
    
    Keep it brief and friendly!
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a friendly calendar assistant. Be helpful and encouraging."),
        HumanMessage(content=prompt)
    ])
    
    state["final_summary"] = response.content
    return state

# Build the LangGraph workflow
def build_calendar_graph():
    """Construct the calendar agent graph"""
    workflow = StateGraph(CalendarState)
    
    # Add nodes
    workflow.add_node("parse", parse_schedule)
    workflow.add_node("prioritize", identify_priorities)
    workflow.add_node("summarize", generate_summary)
    
    # Define edges (flow)
    workflow.set_entry_point("parse")
    workflow.add_edge("parse", "prioritize")
    workflow.add_edge("prioritize", "summarize")
    workflow.add_edge("summarize", END)
    
    return workflow.compile()

# Create the compiled graph
calendar_graph = build_calendar_graph()

def calendar_agent(meetings):
    """
    LangGraph-powered Calendar Agent:
    Uses a multi-step workflow to analyze and summarize meetings.
    
    Workflow:
    1. Parse schedule (organize chronologically)
    2. Identify priorities (high/medium/low)
    3. Generate summary (friendly overview with tips)
    """
    
    # Initialize state
    initial_state: CalendarState = {
        "meetings": meetings if isinstance(meetings, list) else [],
        "parsed_schedule": "",
        "priorities": "",
        "final_summary": ""
    }
    
    # Run the graph
    result = calendar_graph.invoke(initial_state)
    
    return result["final_summary"]