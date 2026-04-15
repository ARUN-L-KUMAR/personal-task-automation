# 🧠 LLM-Based Cooperative Multi-Agent System

## Use Case: Personal Task Automation

---

## 📌 Project Overview

This project implements a **real cooperative multi-agent system** using **LangChain and LangGraph** for **autonomous personal task automation**.

The system uses **six specialized AI agents** that collaborate through a graph-based workflow to analyze schedules, detect conflicts, adjust for real-world constraints, and generate intelligent task recommendations.

**🆕 Now featuring a complete LangGraph-based multi-agent architecture with AI-powered decision making across all agents!**

---

## 🎯 Objective

To design and implement a system where **multiple AI agents cooperate** to:

* Intelligently understand and analyze user schedules
* Detect and resolve meeting/task conflicts using AI reasoning
* Add contextual adjustments (e.g., travel time, preparation)
* Generate optimized daily planning with actionable suggestions
* Provide natural language explanations and recommendations

---

## 🏗 System Architecture

### Multi-Agent Graph Workflow

The system follows a **LangGraph-based cooperative agent workflow**:

```
User Input → FastAPI Layer
       ↓
┌─────────────────────────────────┐
│   LangGraph Agent Workflow      │
├─────────────────────────────────┤
│  1. CalendarAgent (AI)          │
│     ↓                            │
│  2. TaskAgent (AI)               │
│     ↓                            │
│  3. ConflictAgent (AI)           │
│     ↓                            │
│  4. TravelAgent (AI)             │
│     ↓                            │
│  5. PlanningAgent (AI)           │
│     ↓                            │
│  6. CoordinatorAgent (AI)        │
└─────────────────────────────────┘
       ↓
  Final AI Response
```

Each agent is **AI-powered** using LangChain and performs intelligent reasoning, forming an **autonomous decision pipeline**.

---

## 🤖 AI Agents

### 1. **CalendarAgent**
- Analyzes meeting schedules using LLM
- Identifies busy periods and patterns
- Provides insights about time distribution
- Returns structured JSON analysis

### 2. **TaskAgent**
- Analyzes task deadlines with AI reasoning
- Assesses urgency and priority
- Evaluates workload (light/moderate/heavy)
- Recommends action priorities

### 3. **ConflictAgent**
- Intelligently detects scheduling conflicts
- Identifies time overlaps, buffer issues
- Assesses conflict severity (high/medium/low)
- Provides detailed conflict descriptions

### 4. **TravelAgent**
- Plans travel logistics using AI
- Estimates travel times between locations
- Recommends departure times
- Considers traffic patterns and preparation needs

### 5. **PlanningAgent**
- Synthesizes all information
- Creates optimized daily schedules
- Suggests conflict resolutions
- Provides time management tips

### 6. **CoordinatorAgent**
- Coordinates all agent outputs
- Generates friendly, actionable summaries
- Provides encouragement and focus areas
- Creates final user-facing response

---

## 🧰 Tech Stack

| Layer            | Technology                           |
| ---------------- | ------------------------------------ |
| Backend          | FastAPI (Python)                     |
| Frontend         | React.js                             |
| AI Framework     | LangChain + LangGraph                |
| LLM Provider     | OpenRouter (DeepSeek-R1 - Free tier) |
| Agent Workflow   | LangGraph State Machine              |
| Data Format      | JSON / Pydantic Models               |

---

## 📁 Project Structure

```
Personal_Task/
├── README.md
├── docs/
│   ├── architecture/            # Architecture references and diagrams
│   ├── guides/                  # Quickstart, run, and testing guides
│   ├── migrations/              # Migration completion and status notes
│   └── research/                # Defense and prompt/data summary docs
├── backend/
│   ├── main.py                  # FastAPI entrypoint
│   ├── app/                     # Main application package
│   ├── agents/                  # LangGraph agents
│   ├── graph/                   # Agent graph/workflow
│   ├── routers/                 # API route modules
│   ├── services/                # Service-layer logic
│   ├── scripts/
│   │   └── maintenance/         # One-off maintenance utilities
│   ├── prompts/                 # Agent prompts
│   ├── data/                    # Seed/sample data
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── public/
│   ├── build/                   # Production build output
│   └── src/
└── archive/
  ├── backend/                 # Archived diagnostics/tests
  └── frontend/                # Archived backup files
```

---

## ⚙️ Setup Instructions

### 1️⃣ Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- OpenRouter API key (free tier available)

### 2️⃣ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows (or: source venv/bin/activate on Linux/Mac)
pip install -r requirements.txt
```

Create a `.env` file inside the backend folder:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**Get a free OpenRouter API key**: [https://openrouter.ai/](https://openrouter.ai/)

---

## 🚀 How to Run

### Option 1: CLI (Command Line Interface) ⭐ Recommended for Testing

```bash
cd backend
.\venv\Scripts\activate   # Windows
python cli.py
```

**Features:**
- Interactive schedule entry
- Pre-loaded sample scenarios
- Formatted AI analysis output
- Save results to JSON
- Easy testing and debugging

**Example Usage:**
```
🤖 AI Personal Task Automation (Multi-Agent CLI)

Choose input method:
   1. Enter schedule manually
   2. Use sample scenario ⭐
   3. Exit

Your choice (1-3): 2

Select scenario:
   1. light_day (1 meeting, 1 task)
   2. busy_day (3 meetings, 3 tasks) 
   3. travel_heavy (4 meetings, 2 tasks)

[AI agents analyze and provide insights...]
```

### Option 2: API Server (Web Service)

Start the FastAPI server:

```bash
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

Backend runs at:
👉 **http://127.0.0.1:8000**

API Docs (Interactive):
👉 **http://127.0.0.1:8000/docs**

**Test with PowerShell:**
```powershell
$body = @{
    meetings = @(
        @{title = "Team Meeting"; time = "10:00 AM"; location = "Office"}
    )
    tasks = @(
        @{title = "Complete Report"; deadline = "5:00 PM"}
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/plan-day" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

---

### 3️⃣ Frontend Setup (Optional)

```bash
cd frontend
npm install
npm start
```

Frontend runs at:
👉 [http://localhost:3000](http://localhost:3000)

---

## 🧪 How the Multi-Agent System Works

1. **User provides** meeting and task details via API
2. **LangGraph workflow** initiates with initial state
3. **CalendarAgent** (AI) analyzes meeting schedule intelligence
4. **TaskAgent** (AI) evaluates task urgency and priorities
5. **ConflictAgent** (AI) detects scheduling conflicts using reasoning
6. **TravelAgent** (AI) plans travel logistics with time estimates
7. **PlanningAgent** (AI) creates optimized schedule with resolutions
8. **CoordinatorAgent** (AI) synthesizes into friendly user response
9. **System returns** comprehensive AI-powered recommendations

### Graph Workflow Visualization

```
START
  ↓
[analyze_calendar] → Calendar insights generated
  ↓
[analyze_tasks] → Task priorities identified
  ↓
[detect_conflicts] → Conflicts discovered & analyzed
  ↓
[plan_travel] → Travel logistics planned
  ↓
[create_plan] → Optimized schedule created
  ↓
[coordinate] → Final response synthesized
  ↓
END
```

---

## 📡 API Endpoints

### **GET /**
Returns system status and agent information

### **POST /plan-day**

Example Input:

```json
{
  "meetings": [
    { "title": "Project Review", "time": "10:00 AM", "location": "College" }
  ],
  "tasks": [
    { "title": "Finish Assignment", "deadline": "10:30 AM" }
  ]
}
```

Example Output:

```json
{
  "status": "success",
  "calendar_analysis": {
    "summary": "One meeting scheduled for morning",
    "busy_periods": ["10:00 AM - 11:00 AM"],
    "locations": ["College"],
    "total_meetings": 1,
    "insights": ["Morning meeting requires travel planning"]
  },
  "task_analysis": {
    "summary": "One urgent task due soon",
    "urgent_tasks": ["Finish Assignment"],
    "priority_order": ["Finish Assignment"],
    "total_tasks": 1,
    "workload_assessment": "moderate",
    "recommendations": ["Complete assignment before meeting"]
  },
  "conflict_analysis": {
    "has_conflicts": true,
    "conflicts": [
      {
        "type": "deadline_conflict",
        "severity": "high",
        "description": "Task deadline overlaps with meeting time",
        "items_involved": ["Project Review", "Finish Assignment"]
      }
    ],
    "conflict_count": 1,
    "summary": "Scheduling conflict detected"
  },
  "travel_plan": {
    "travel_plan": [...],
    "summary": "30 minutes travel time recommended",
    "total_travel_time": "30 minutes"
  },
  "optimized_plan": {
    "optimized_schedule": [...],
    "conflict_resolutions": ["Complete assignment by 9:30 AM before leaving"],
    "time_management_tips": [...],
    "focus_areas": ["Assignment completion", "Meeting preparation"]
  },
  "final_response": "Your morning has a tight schedule with one meeting at 10:00 AM...",
  "metadata": {
    "architecture": "Multi-Agent Graph",
    "agents_used": 6,
    "workflow": "Sequential AI Pipeline"
  }
}
```

---

## 📚 Quick Reference

### Commands Cheat Sheet

```bash
# Setup (one-time)
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Run CLI
python cli.py

# Run API Server
uvicorn main:app --reload

# Test individual components
python -c "from data.data_loader import list_all_scenarios; print(list_all_scenarios())"
```

### File Locations

- **CLI Script**: `backend/cli.py`
- **API Server**: `backend/main.py`
- **Sample Data**: `backend/data/sample_data.json`
- **Agent Code**: `backend/agents/*.py`
- **Configuration**: `backend/config/settings.py`
- **API Key**: `backend/.env`

### Documentation

- 📖 **Quick Start**: `QUICKSTART.md`
- 🚀 **Run Guide**: `RUN_GUIDE.md` ⭐
- 🧪 **Testing Guide**: `TESTING_GUIDE.md`
- 🏗️ **Architecture**: `ARCHITECTURE_DIAGRAMS.md`
- 📊 **Comparison**: `ARCHITECTURE_COMPARISON.md`
- 📁 **Data Info**: `backend/data/README.md`
- 📝 **Prompts Info**: `backend/prompts/README.md`

### Troubleshooting

**Problem**: Module not found
```bash
pip install -r requirements.txt
```

**Problem**: API key error
```bash
# Add to backend/.env:
OPENROUTER_API_KEY=your_key_here
```

**Problem**: Port in use
```bash
uvicorn main:app --reload --port 8001
```

---

## 🎯 Project Status

✅ **Complete Features:**
- Multi-agent AI system with 6 specialized agents
- LangGraph workflow orchestration
- CLI interface for testing
- FastAPI REST API
- Sample data and test scenarios
- Comprehensive documentation

🔄 **Future Enhancements:**

* Integration with **LangChain-powered reasoning agents**
* Multi-agent orchestration using **LangGraph**
* Google Calendar API integration
* Gmail-based task detection
* Notification system
* Persistent memory for user preferences
* Advanced LLM reasoning loops

---

## 👥 Team Members

| Name         | Role                           |
| ------------ | ------------------------------ |
| Arunkumar L  | Backend & AI Agent Development |
| Aishwariya D | Frontend Development           |
| Suganya U    | Testing & Validation           |
| Mukilan S    | Documentation & Research       |

---

## 📜 License

This project is developed for academic purposes as part of a final year project.

---

## 🙏 Acknowledgement

Guided by faculty and inspired by advancements in **LLM-based cooperative multi-agent systems for autonomous task automation**.

---
