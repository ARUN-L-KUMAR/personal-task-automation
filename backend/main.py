from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

from agents.calendar_agent import calendar_agent
from agents.task_agent import task_agent
from agents.conflict_agent import conflict_agent
from agents.travel_agent import travel_agent
from agents.planning_agent import planning_agent
from agents.llm_explanation_agent import llm_explanation_agent
from utils.file_handler import save_input, save_output
from utils.file_handler import load_input, load_output

load_dotenv()

app = FastAPI(title="AI Personal Task Automation System")


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
    return {"message": "Personal Task Automation Backend is Running 🚀"}

@app.post("/plan-day")
def analyze_schedule(data: ScheduleInput):
    meetings_list = [m.dict() for m in data.meetings]
    tasks_list = [t.dict() for t in data.tasks]

    # Save input
    save_input({
        "meetings": meetings_list,
        "tasks": tasks_list
    })

    # Run agents
    calendar_result = calendar_agent(meetings_list)
    task_result = task_agent(tasks_list)
    conflict_result = conflict_agent(meetings_list, tasks_list)
    travel_result = travel_agent(meetings_list)
    planning_result = planning_agent(conflict_result)
    ai_explanation = llm_explanation_agent(conflict_result)

    response = {
        "calendar_analysis": calendar_result,
        "task_analysis": task_result,
        "conflict_analysis": conflict_result,
        "travel_reminders": travel_result,
        "rule_based_plan": planning_result,
        "ai_explanation": ai_explanation
    }

    # Save output
    save_output(response)

    return response



@app.get("/last-input")
def get_last_input():
    return load_input() or {"message": "No input data found."}


@app.get("/last-output")
def get_last_output():
    return load_output() or {"message": "No output data found."}
@app.post("/plan-day-from-db")
def analyze_from_db():
    data = load_input()

    if not data:
        return {"error": "No input data found in database."}

    meetings_list = data.get("meetings", [])
    tasks_list = data.get("tasks", [])

    # Run agents using fetched data
    calendar_result = calendar_agent(meetings_list)
    task_result = task_agent(tasks_list)
    conflict_result = conflict_agent(meetings_list, tasks_list)
    travel_result = travel_agent(meetings_list)
    planning_result = planning_agent(conflict_result)
    ai_explanation = llm_explanation_agent(conflict_result)

    response = {
        "calendar_analysis": calendar_result,
        "task_analysis": task_result,
        "conflict_analysis": conflict_result,
        "travel_reminders": travel_result,
        "rule_based_plan": planning_result,
        "ai_explanation": ai_explanation
    }

    save_output(response)

    return response
