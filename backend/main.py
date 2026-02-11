from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from agents.agent_graph import agent_app
from config.settings import api_config
from utils.data_manager import data_manager

# ============================================
# FASTAPI APP INITIALIZATION
# ============================================

app = FastAPI(
    title=api_config.TITLE,
    description=api_config.DESCRIPTION,
    version=api_config.VERSION
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=api_config.CORS_ORIGINS,
    allow_credentials=api_config.CORS_CREDENTIALS,
    allow_methods=api_config.CORS_METHODS,
    allow_headers=api_config.CORS_HEADERS,
)


# ============================================
# PYDANTIC MODELS
# ============================================

class Meeting(BaseModel):
    title: str
    time: str
    location: Optional[str] = None
    duration: Optional[str] = None


class Task(BaseModel):
    title: str
    deadline: str
    priority: Optional[str] = None


class ScheduleInput(BaseModel):
    meetings: List[Meeting]
    tasks: List[Task]


class ScheduleResponse(BaseModel):
    calendar_analysis: str
    task_analysis: str
    conflict_analysis: list
    travel_reminders: str
    ai_suggestions: str


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "Personal Task Automation API is live!",
        "endpoints": {
            "analyze": "POST /analyze-schedule",
            "history": "GET /history",
            "stats": "GET /stats"
        }
    }


@app.post("/analyze-schedule", response_model=ScheduleResponse)
def analyze_schedule(data: ScheduleInput):
    """
    Main endpoint: Analyze schedule using LangGraph workflow.
    
    This runs all 5 agents in sequence:
    1. Calendar Agent - Organizes meetings
    2. Task Agent - Prioritizes tasks
    3. Conflict Agent - Detects conflicts
    4. Travel Agent - Generates travel reminders
    5. Planning Agent - Provides AI suggestions
    """
    try:
        # Prepare initial state
        meetings_list = [m.model_dump() for m in data.meetings]
        tasks_list = [t.model_dump() for t in data.tasks]
        
        initial_state = {
            "meetings": meetings_list,
            "tasks": tasks_list,
            "calendar_analysis": "",
            "task_analysis": "",
            "conflict_analysis": [],
            "travel_reminders": "",
            "ai_suggestions": "",
            "current_step": "start",
            "errors": []
        }
        
        # Save input data
        if data_manager.save_input(meetings_list, tasks_list):
            print("✅ Input saved to data/input.json")
        
        # Run the LangGraph workflow
        result = agent_app.invoke(initial_state)
        
        # Prepare response
        response = ScheduleResponse(
            calendar_analysis=result["calendar_analysis"],
            task_analysis=result["task_analysis"],
            conflict_analysis=result["conflict_analysis"],
            travel_reminders=result["travel_reminders"],
            ai_suggestions=result["ai_suggestions"]
        )
        
        # Save output data
        output_dict = response.model_dump()
        if data_manager.save_output(output_dict):
            print("✅ Output saved to data/output.json")
        
        # Save to history
        if data_manager.save_to_history(
            {"meetings": meetings_list, "tasks": tasks_list},
            output_dict
        ):
            print("✅ Analysis saved to history")
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
def get_history(limit: Optional[int] = 10):
    """
    Get previous analysis results.
    
    Args:
        limit: Number of previous analyses to return (default: 10)
    
    Returns:
        List of previous analyses
    """
    try:
        history = data_manager.load_history(limit=limit)
        return {
            "status": "success",
            "count": len(history),
            "data": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
def get_stats():
    """Get statistics about stored data"""
    try:
        stats = data_manager.get_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/favicon.ico")
def get_favicon():
    """Favicon endpoint to prevent 404 errors"""
    return {"status": "ok"}


# ============================================
# RUN SERVER
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=api_config.HOST,
        port=api_config.PORT,
        reload=api_config.DEBUG
    )