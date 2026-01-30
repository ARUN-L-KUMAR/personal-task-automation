# 🧠 LLM-Based Cooperative Multi-Agent System

## Use Case: Personal Task Automation

---

## 📌 Project Overview

This project implements a **cooperative multi-agent system** designed for **autonomous personal task automation**.

Instead of relying on a single AI model, this system uses **multiple specialized agents** that collaborate to analyze schedules, detect conflicts, adjust for real-world constraints, and generate smart task recommendations.

The current version includes a **working backend prototype** with multiple interacting agents. Future versions will enhance reasoning using **LLM-powered agents via LangChain and LangGraph**.

---

## 🎯 Objective

To design and implement a system where **multiple AI agents cooperate** to:

* Understand user schedules
* Analyze meetings and task deadlines
* Detect time conflicts
* Add contextual adjustments (e.g., travel time)
* Generate intelligent daily planning suggestions

---

## 🏗 System Architecture

The system follows a **cooperative agent workflow**:

```
User Input → Coordinator (API Layer)
       ↓
  ┌──────────────┬──────────────┐
Calendar Agent   Task Agent
       ↓              ↓
      Conflict Agent
       ↓
     Travel Agent
       ↓
    Planning Agent
       ↓
  Final AI Response
```

Each agent performs a specific responsibility and passes results to the next stage, forming an **autonomous decision pipeline**.

---

## 🤖 Agents Implemented (Current Version)

| Agent              | Role                                              |
| ------------------ | ------------------------------------------------- |
| **Calendar Agent** | Reads and formats meeting schedule                |
| **Task Agent**     | Reads task deadlines                              |
| **Conflict Agent** | Detects time conflicts between meetings and tasks |
| **Travel Agent**   | Adds travel time buffer before meetings           |
| **Planning Agent** | Generates smart scheduling suggestions            |

---

## 🧰 Tech Stack

| Layer                    | Technology                                 |
| ------------------------ | ------------------------------------------ |
| Backend                  | FastAPI (Python)                           |
| Frontend                 | React.js (In Progress)                     |
| AI Agents                | Python-based modular agent architecture    |
| LLM (Planned)            | OpenAI API via LangChain                   |
| Agent Workflow (Planned) | LangGraph                                  |
| Data                     | JSON / API Input (Simulated schedule data) |

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/personal-task-automation.git
cd personal-task-automation
```

---

### 2️⃣ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

Create a `.env` file inside the backend folder:

```
OPENAI_API_KEY=your_openai_api_key_here
```

Run backend server:

```bash
uvicorn main:app --reload
```

Backend runs at:
👉 [http://127.0.0.1:8000](http://127.0.0.1:8000)
API Docs:
👉 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3️⃣ Frontend Setup (UI Under Development)

```bash
cd frontend
npm install
npm start
```

Frontend runs at:
👉 [http://localhost:3000](http://localhost:3000)

---

## 🧪 How the System Works

1. User provides meeting and task details
2. **Calendar Agent** processes meeting data
3. **Task Agent** processes task deadlines
4. **Conflict Agent** detects overlapping schedules
5. **Travel Agent** adds travel buffer reminders
6. **Planning Agent** generates smart schedule suggestions
7. System returns structured recommendations

---

## 📡 Current API Endpoint

### **POST /analyze-schedule**

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
  "calendar_analysis": "...",
  "task_analysis": "...",
  "conflict_analysis": ["..."],
  "travel_reminders": ["..."],
  "ai_suggestions": ["..."]
}
```

---

## 🚀 Future Enhancements

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
