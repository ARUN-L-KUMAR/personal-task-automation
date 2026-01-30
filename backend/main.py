from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import json

from graph.agent_graph import ScheduleAgentGraph

load_dotenv()

app = FastAPI(title="AI Personal Task Automation System - Multi-Agent")

# Initialize the agent graph
agent_graph = ScheduleAgentGraph()


class Meeting(BaseModel):
    title: str
    time: str
    location: str


class Task(BaseModel):
    title: str
    deadline: str


class ScheduleInput(BaseModel):
    meetings: List[Meeting]
    tasks: List[Task]


@app.get("/")
def read_root():
    return {
        "message": "Personal Task Automation Backend is Running 🚀",
        "architecture": "LangGraph Multi-Agent System",
        "agents": [
            "CalendarAgent",
            "TaskAgent",
            "ConflictAgent",
            "TravelAgent",
            "PlanningAgent",
            "CoordinatorAgent"
        ]
    }


@app.post("/plan-day")
def analyze_schedule(data: ScheduleInput):
    """
    Multi-agent schedule analysis using LangGraph workflow
    
    The system uses a graph-based multi-agent architecture where:
    1. CalendarAgent analyzes meetings
    2. TaskAgent analyzes tasks
    3. ConflictAgent detects scheduling conflicts
    4. TravelAgent plans travel logistics
    5. PlanningAgent creates optimized schedule
    6. CoordinatorAgent synthesizes final response
    """
    # Convert Pydantic → dict
    meetings_list = [m.dict() for m in data.meetings]
    tasks_list = [t.dict() for t in data.tasks]

    # Execute the multi-agent graph workflow
    result = agent_graph.execute(meetings_list, tasks_list)

    return {
        "status": "success",
        "calendar_analysis": result["calendar_analysis"],
        "task_analysis": result["task_analysis"],
        "conflict_analysis": result["conflicts"],
        "travel_plan": result["travel_plan"],
        "optimized_plan": result["optimized_plan"],
        "final_response": result["final_response"],
        "metadata": {
            "architecture": "Multi-Agent Graph",
            "agents_used": 6,
            "workflow": "Sequential AI Pipeline"
        }
    }
