# 🧠 LLM-Based Cooperative Multi-Agent System  
## Use Case: Personal Task Automation

---

## 📌 Project Overview

This project implements an **LLM-based cooperative multi-agent system** designed for **autonomous task automation**.

Instead of relying on a single AI model, this system uses **multiple specialized agents** that collaborate to analyze, plan, validate, and execute tasks. The current implementation focuses on **Personal Task Automation**, where agents help organize schedules, detect conflicts, and suggest optimized daily plans.

This project is inspired by modern research on **LLM-powered multi-agent systems** for intelligent automation.

---

## 🎯 Objective

To design and implement a system where **multiple AI agents cooperate** to:

- Understand user tasks  
- Plan execution steps  
- Detect scheduling conflicts  
- Add contextual adjustments (e.g., travel time)  
- Generate intelligent task recommendations  

---

## 🏗 System Architecture

The system follows a **cooperative agent workflow**:

```
User Input → Coordinator Agent
       ↓
  ┌─────────┼─────────┐
Calendar Agent  Task Agent
       ↓             ↓
Conflict Agent  Travel Agent
       ↓
  Planning Agent
       ↓
  Final Response
```

Each agent performs a specific responsibility and communicates with others to complete the task autonomously.

---

## 🤖 Agents in This System

| Agent | Role |
|------|------|
| **Coordinator Agent** | Controls workflow between agents |
| **Calendar Agent** | Reads meeting schedule |
| **Task Agent** | Reads task deadlines |
| **Conflict Agent** | Detects time conflicts |
| **Travel Agent** | Adds travel time buffer |
| **Planning Agent** | Generates smart schedule recommendation |

---

## 🧰 Tech Stack

| Layer | Technology |
|------|-------------|
| Backend | FastAPI (Python) |
| Frontend | React.js |
| AI Agents | LangChain + LangGraph |
| LLM | OpenAI API |
| Data | JSON (Simulated schedule data) |

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

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at:
👉 [http://localhost:3000](http://localhost:3000)

---

## 🧪 How the System Works

1. User enters meeting and task details
2. Calendar & Task agents analyze data
3. Conflict agent checks overlaps
4. Travel agent adds commute buffer
5. Planning agent suggests optimized schedule
6. Final recommendation is returned to user

---

## 🚀 Future Enhancements

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

Guided by faculty and inspired by recent advancements in **LLM-based multi-agent cooperative systems for autonomous task automation**.

---
