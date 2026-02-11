from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Annotated
from dotenv import load_dotenv
import operator
import os

# Load environment variables from .env file
load_dotenv()

# Initialize LLM - Using OpenRouter
llm = ChatOpenAI(
    model="openai/gpt-4o-mini",  # OpenRouter model format
    temperature=0.3,
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1"  # OpenRouter endpoint
)

# Define State Schema for LangGraph
class PlanningState(TypedDict):
    conflicts: List[str]
    analysis: str
    suggestions: List[str]
    final_plan: str

# Node 1: Analyze Conflicts
def analyze_conflicts(state: PlanningState) -> PlanningState:
    """Analyze the conflicts and understand their severity"""
    conflicts = state["conflicts"]
    
    if "No conflicts detected." in conflicts:
        state["analysis"] = "No scheduling conflicts found. Schedule is clear."
        return state
    
    prompt = f"""
    Analyze these scheduling conflicts:
    {conflicts}
    
    Provide a brief analysis of:
    1. What conflicts exist
    2. Severity (high/medium/low)
    3. Which ones need immediate attention
    
    Be concise.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are an expert schedule analyst."),
        HumanMessage(content=prompt)
    ])
    
    state["analysis"] = response.content
    return state

# Node 2: Generate Suggestions
def generate_suggestions(state: PlanningState) -> PlanningState:
    """Generate actionable suggestions based on analysis"""
    
    if "No scheduling conflicts found" in state["analysis"]:
        state["suggestions"] = ["Your schedule looks good! No changes needed."]
        return state
    
    prompt = f"""
    Based on this conflict analysis:
    {state["analysis"]}
    
    Generate 2-3 specific, actionable suggestions to resolve these conflicts.
    Format as a numbered list.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a productivity expert who gives practical advice."),
        HumanMessage(content=prompt)
    ])
    
    state["suggestions"] = response.content.split("\n")
    return state

# Node 3: Create Final Plan
def create_final_plan(state: PlanningState) -> PlanningState:
    """Synthesize analysis and suggestions into a final plan"""
    
    prompt = f"""
    Create a brief, friendly summary for the user based on:
    
    Analysis: {state["analysis"]}
    Suggestions: {state["suggestions"]}
    
    Format:
    📊 **Schedule Analysis**: (1-2 sentences)
    💡 **Recommendations**: (bullet points)
    ✅ **Action Items**: (specific next steps)
    
    Keep it concise and actionable.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a helpful personal assistant."),
        HumanMessage(content=prompt)
    ])
    
    state["final_plan"] = response.content
    return state

# Build the LangGraph workflow
def build_planning_graph():
    """Construct the planning agent graph"""
    workflow = StateGraph(PlanningState)
    
    # Add nodes
    workflow.add_node("analyze", analyze_conflicts)
    workflow.add_node("suggest", generate_suggestions)
    workflow.add_node("plan", create_final_plan)
    
    # Define edges (flow)
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "suggest")
    workflow.add_edge("suggest", "plan")
    workflow.add_edge("plan", END)
    
    return workflow.compile()

# Create the compiled graph
planning_graph = build_planning_graph()

def planning_agent(conflicts):
    """
    LangGraph-powered Planning Agent:
    Uses a multi-step reasoning workflow to analyze conflicts
    and generate smart, actionable suggestions.
    
    Workflow:
    1. Analyze conflicts (understand severity)
    2. Generate suggestions (practical solutions)
    3. Create final plan (actionable summary)
    """
    
    # Initialize state
    initial_state: PlanningState = {
        "conflicts": conflicts if isinstance(conflicts, list) else [conflicts],
        "analysis": "",
        "suggestions": [],
        "final_plan": ""
    }
    
    # Run the graph
    result = planning_graph.invoke(initial_state)
    
    return result["final_plan"]
