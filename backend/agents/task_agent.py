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
class TaskState(TypedDict):
    tasks: List[dict]
    organized_tasks: str
    urgency_analysis: str
    final_summary: str

# Node 1: Organize Tasks
def organize_tasks(state: TaskState) -> TaskState:
    """Organize tasks by deadline and group by type"""
    tasks = state["tasks"]
    
    if not tasks:
        state["organized_tasks"] = "No tasks scheduled."
        return state
    
    prompt = f"""
    Organize these tasks by deadline (earliest first):
    
    {tasks}
    
    Format each as:
    📝 [TITLE] - Due: [DEADLINE]
    
    Group similar tasks together if possible.
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a task organizer. Be clear and sort by deadline."),
        HumanMessage(content=prompt)
    ])
    
    state["organized_tasks"] = response.content
    return state

# Node 2: Analyze Urgency
def analyze_urgency(state: TaskState) -> TaskState:
    """Analyze urgency and flag critical tasks"""
    tasks = state["tasks"]
    organized_tasks = state["organized_tasks"]
    
    if "No tasks" in organized_tasks:
        state["urgency_analysis"] = "No urgent tasks."
        return state
    
    prompt = f"""
    Analyze these tasks for urgency:
    
    {organized_tasks}
    
    Identify:
    - 🔴 CRITICAL: Due within 2 hours or overdue
    - 🟡 SOON: Due today
    - 🟢 LATER: Due after today
    
    Format: "[Task title]: [Urgency level] - [Why]"
    """
    
    response = llm.invoke([
        SystemMessage(content="You are an urgency analyst. Flag tasks that need immediate attention."),
        HumanMessage(content=prompt)
    ])
    
    state["urgency_analysis"] = response.content
    return state

# Node 3: Generate Final Summary
def generate_summary(state: TaskState) -> TaskState:
    """Create a friendly, actionable task summary"""
    organized_tasks = state["organized_tasks"]
    urgency_analysis = state["urgency_analysis"]
    
    if "No tasks" in organized_tasks:
        state["final_summary"] = "✅ No tasks scheduled. Enjoy your free time or plan ahead!"
        return state
    
    prompt = f"""
    Create a friendly task summary:
    
    Organized Tasks:
    {organized_tasks}
    
    Urgency Analysis:
    {urgency_analysis}
    
    Format:
    📋 **Today's Task Overview**
    
    [Organized list of tasks]
    
    ⚡ **Critical Tasks:**
    - [List critical tasks to do first]
    
    💡 **Quick Tips:**
    - [1-2 tips for productivity or time management]
    
    Keep it brief and motivating!
    """
    
    response = llm.invoke([
        SystemMessage(content="You are a friendly task assistant. Be motivating and practical."),
        HumanMessage(content=prompt)
    ])
    
    state["final_summary"] = response.content
    return state

# Build the LangGraph workflow
def build_task_graph():
    """Construct the task agent graph"""
    workflow = StateGraph(TaskState)
    
    # Add nodes
    workflow.add_node("organize", organize_tasks)
    workflow.add_node("analyze_urgency", analyze_urgency)
    workflow.add_node("summarize", generate_summary)
    
    # Define edges (flow)
    workflow.set_entry_point("organize")
    workflow.add_edge("organize", "analyze_urgency")
    workflow.add_edge("analyze_urgency", "summarize")
    workflow.add_edge("summarize", END)
    
    return workflow.compile()

# Create the compiled graph
task_graph = build_task_graph()

def task_agent(tasks):
    """
    LangGraph-powered Task Agent:
    Uses a multi-step workflow to organize, analyze, and summarize tasks.
    
    Workflow:
    1. Organize tasks (by deadline/type)
    2. Analyze urgency (flag critical tasks)
    3. Generate summary (friendly overview with tips)
    """
    
    # Initialize state
    initial_state: TaskState = {
        "tasks": tasks if isinstance(tasks, list) else [],
        "organized_tasks": "",
        "urgency_analysis": "",
        "final_summary": ""
    }
    
    # Run the graph
    result = task_graph.invoke(initial_state)
    
    return result["final_summary"]