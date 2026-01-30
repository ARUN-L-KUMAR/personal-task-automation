# 🧠 LLM-Based Cooperative Multi-Agent System

## Use Case: Personal Task Automation

---

## 📌 Project Overview

This project implements an **LLM-based cooperative multi-agent system** for **autonomous personal task automation**.

Instead of relying on a single monolithic AI model, the system is composed of **multiple specialized agents** that cooperate to analyze schedules, detect conflicts, apply real-world constraints, and generate intelligent recommendations.

The system combines:

* **Deterministic rule-based agents** for correctness and reliability
* **LLM-powered agents** for human-like explanations and reasoning transparency

It supports **both REST API and CLI interfaces** and uses a **JSON-based data layer** that acts as a lightweight database.

---

## 🎯 Objective

To design and implement a system where **multiple agents collaborate** to:

* Understand user schedules
* Analyze meetings and task deadlines
* Detect time conflicts
* Apply contextual constraints (e.g., travel buffer)
* Generate intelligent daily planning suggestions
* Provide **AI-generated natural language explanations**

---

## 🏗 System Architecture

The system follows a **cooperative multi-agent workflow**:

```
User (API / CLI)
        ↓
 Coordinator (FastAPI / CLI Layer)
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
     LLM Explanation Agent
              ↓
        Final Response
```

Each agent performs a focused responsibility, forming an **autonomous decision pipeline**.

---

## 🤖 Agents Implemented (Current Version)

| Agent                     | Role                                                                      |
| ------------------------- | ------------------------------------------------------------------------- |
| **Calendar Agent**        | Reads and formats meeting schedules                                       |
| **Task Agent**            | Reads task deadlines                                                      |
| **Conflict Agent**        | Detects time conflicts between meetings and tasks                         |
| **Travel Agent**          | Adds travel buffer before meetings                                        |
| **Planning Agent**        | Generates rule-based scheduling suggestions                               |
| **LLM Explanation Agent** | Uses an AI model to explain conflicts and suggestions in natural language |

---

## 🧰 Tech Stack

| Layer         | Technology                                 |
| ------------- | ------------------------------------------ |
| Backend       | FastAPI (Python)                           |
| CLI           | Python (Interactive CLI)                   |
| AI Agents     | Modular Python agent architecture          |
| LLM Provider  | OpenRouter                                 |
| LLM Model     | DeepSeek-R1 (configurable)                 |
| Data Layer    | JSON-based file storage (acts as database) |
| Frontend      | React.js (In Progress)                     |
| Configuration | `.env` + `config/settings.py`              |

---

## 📁 Project Structure

```
personal-task-automation/
├── README.md
├── backend/
│   ├── main.py                 # FastAPI backend
│   ├── cli.py                  # CLI interface
│   ├── requirements.txt
│   ├── agents/
│   │   ├── calendar_agent.py
│   │   ├── task_agent.py
│   │   ├── conflict_agent.py
│   │   ├── travel_agent.py
│   │   ├── planning_agent.py
│   │   └── llm_explanation_agent.py
│   ├── utils/
│   │   ├── time_parser.py      # Robust time normalization
│   │   └── file_handler.py     # JSON persistence
│   ├── config/
│   │   └── settings.py         # AI model configuration
│   └── data/
│       ├── input.json          # Stored meetings & tasks
│       └── output.json         # Stored analysis result
└── frontend/
    └── (React UI – under development)
```

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

Create a `.env` file inside `backend/`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
AI_PROVIDER=openrouter
AI_MODEL_NAME=deepseek/deepseek-r1
AI_TEMPERATURE=0.4
AI_MAX_TOKENS=150
```

Run backend server:

```bash
uvicorn main:app --reload
```

Backend:

* [http://127.0.0.1:8000](http://127.0.0.1:8000)
* Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3️⃣ CLI Usage

```bash
cd backend
python cli.py
```

CLI supports:

1. Entering **new meeting & task data**
2. Running analysis using **stored database data (`data/input.json`)**

---

## 🧪 How the System Works

### Execution Flow

1. Input is provided via **API or CLI**
2. Input is saved to `data/input.json`
3. Agents execute sequentially:

   * Calendar → Task → Conflict → Travel → Planning
4. **LLM Explanation Agent** generates human-readable insights
5. Output is saved to `data/output.json`
6. Response is returned to API / CLI

The same pipeline supports **replay-based execution** from stored data.

---

## 📡 API Endpoints

### **POST /plan-day**

Runs analysis using request payload.

### **POST /plan-day-from-db**

Runs analysis using data stored in `data/input.json`.

### **GET /last-input**

Fetch last stored input.

### **GET /last-output**

Fetch last computed result.

---

## 🚀 Future Enhancements

* LangGraph-based multi-agent orchestration
* Advanced LLM reasoning loops
* Google Calendar integration
* Gmail-based task extraction
* Notification & reminder system
* User preference memory
* Blockchain-based audit logging (optional)

---

## 👥 Team Members

| Name             | Role                                        |
| ---------------- | ------------------------------------------- |
| **Arunkumar L**  | Backend, Multi-Agent System, AI Integration |
| **Aishwariya D** | Frontend Development                        |
| **Suganya U**    | Testing & Validation                        |
| **Mukilan S**    | Documentation & Research                    |

---

## 📜 License

Developed for academic purposes as part of a **Final Year Project**.

---

## 🙏 Acknowledgement

Guided by faculty and inspired by recent research in
**LLM-based cooperative multi-agent systems for autonomous task automation**.

---