from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from agents.calendar_agent import calendar_agent
from agents.task_agent import task_agent
from agents.conflict_agent import conflict_agent
from agents.travel_agent import travel_agent
from agents.planning_agent import planning_agent

app = FastAPI()

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

@app.post("/analyze-schedule")
def analyze_schedule(data: ScheduleInput):
    meetings_list = [meeting.dict() for meeting in data.meetings]
    tasks_list = [task.dict() for task in data.tasks]

    calendar_result = calendar_agent(meetings_list)
    task_result = task_agent(tasks_list)
    conflict_result = conflict_agent(meetings_list, tasks_list)
    travel_result = travel_agent(meetings_list)
    planning_result = planning_agent(conflict_result)

    return {
        "calendar_analysis": calendar_result,
        "task_analysis": task_result,
        "conflict_analysis": conflict_result,
        "travel_reminders": travel_result,
        "ai_suggestions": planning_result
    }