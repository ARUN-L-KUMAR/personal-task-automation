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
    temperature=0.2,
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1"
)

# Define State Schema for LangGraph
class TravelState(TypedDict):
    meetings: List[dict]
    location_analysis: str
    travel_times: List[str]
    final_reminders: str

# Node 1: Analyze Locations
def analyze_locations(state: TravelState) -> TravelState:
    """Analyze meeting locations and categorize them"""
    meetings = state["meetings"]
    
    if not meetings:
        state["location_analysis"] = "No meetings to analyze."
        return state
    
    prompt = f"""
    Analyze these meeting locations:
    
    {meetings}
    
    For each meeting, categorize the location as:
    - 🏠 HOME/REMOTE (Zoom, Teams, Google Meet, virtual, online, home)
    - 🏢 OFFICE (office, conference room, workplace)
    - 🚗 EXTERNAL (client site, restaurant, other city, external address)
    
    Format: "Meeting: [title] → [category] ([location])"
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a location classifier. Be accurate and concise."),
        HumanMessage(content=prompt)
    ])
    
    state["location_analysis"] = response.content
    return state

# Node 2: Estimate Travel Times
def estimate_travel_times(state: TravelState) -> TravelState:
    """Estimate travel time for each meeting based on location type"""
    meetings = state["meetings"]
    location_analysis = state["location_analysis"]
    
    if "No meetings" in location_analysis:
        state["travel_times"] = ["No travel needed."]
        return state
    
    prompt = f"""
    Based on this location analysis:
    {location_analysis}
    
    Original meetings:
    {meetings}
    
    Estimate travel time for each meeting:
    - 🏠 HOME/REMOTE: 0 minutes (just login 5 min early)
    - 🏢 OFFICE: 15-30 minutes (depending on usual commute)
    - 🚗 EXTERNAL: 30-60 minutes (account for traffic, parking)
    
    Format: "[Meeting title]: [X] minutes travel time"
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a travel time estimator. Give realistic estimates."),
        HumanMessage(content=prompt)
    ])
    
    state["travel_times"] = [response.content]
    return state

# Node 3: Generate Travel Reminders
def generate_reminders(state: TravelState) -> TravelState:
    """Create actionable travel reminders with departure times"""
    meetings = state["meetings"]
    travel_times = state["travel_times"]
    
    if "No travel needed" in str(travel_times):
        state["final_reminders"] = "🏠 All meetings are remote. No travel needed - just be ready 5 minutes early!"
        return state
    
    prompt = f"""
    Create travel reminders based on:
    
    Meetings:
    {meetings}
    
    Travel Times:
    {travel_times}
    
    For each meeting, generate a reminder:
    Format:
    ⏰ **[Meeting Title]** at [time]
       📍 Location: [location]
       🚗 Leave by: [calculated departure time]
       💡 Tip: [one helpful tip like "bring laptop" or "check traffic"]
    
    Make it friendly and actionable.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a helpful travel reminder assistant. Be friendly and practical."),
        HumanMessage(content=prompt)
    ])
    
    state["final_reminders"] = response.content
    return state

# Build the LangGraph workflow
def build_travel_graph():
    """Construct the travel agent graph"""
    workflow = StateGraph(TravelState)
    
    # Add nodes
    workflow.add_node("analyze_locations", analyze_locations)
    workflow.add_node("estimate_travel", estimate_travel_times)
    workflow.add_node("generate_reminders", generate_reminders)
    
    # Define edges (flow)
    workflow.set_entry_point("analyze_locations")
    workflow.add_edge("analyze_locations", "estimate_travel")
    workflow.add_edge("estimate_travel", "generate_reminders")
    workflow.add_edge("generate_reminders", END)
    
    return workflow.compile()

# Create the compiled graph
travel_graph = build_travel_graph()

def travel_agent(meetings):
    """
    LangGraph-powered Travel Agent:
    Uses a multi-step workflow to generate smart travel reminders.
    
    Workflow:
    1. Analyze locations (categorize as home/office/external)
    2. Estimate travel times (based on location type)
    3. Generate reminders (with departure times and tips)
    """
    
    # Initialize state
    initial_state: TravelState = {
        "meetings": meetings if isinstance(meetings, list) else [],
        "location_analysis": "",
        "travel_times": [],
        "final_reminders": ""
    }
    
    # Run the graph
    result = travel_graph.invoke(initial_state)
    
    return result["final_reminders"]