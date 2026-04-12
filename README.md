# G-ONE: Agentic AI Personal Task Automation Platform

G-ONE is a full-stack AI productivity system that plans your day by combining meetings, tasks, emails, contacts, travel, notes, and optional sheet insights.

This README is written as an A-Z handoff document so anyone (developer, evaluator, or another AI assistant) can understand the complete project without reading the full codebase first.

---

## 0) Project Overview in 60 Seconds

What this project is:

- A cooperative multi-agent planner for personal productivity.
- A complete web application (frontend + backend + database + integrations).
- A dual-mode system:
  - Manual Mode: user provides meetings and tasks.
  - Live Mode: system fetches real Google data and auto-plans.

What this project does:

- Analyzes schedule structure.
- Prioritizes tasks and urgency.
- Detects conflicts.
- Adds travel context.
- Generates an optimized daily plan.
- Explains recommendations in natural language.

Why this project exists:

- Most apps store data but do not reason across all data sources together.
- Users still manually decide what to do first, what clashes, and where time is lost.
- G-ONE reduces this planning load by combining context and reasoning in one pipeline.

---

## 1) Table of Contents

1. What This Project Is and Is Not
2. Why This Project
3. What We Built (Complete Scope)
4. Architecture
5. Agent Pipelines
6. Tech Stack
7. Frontend (Complete)
8. Backend (Complete)
9. Database and Data Model
10. API Catalog (Complete)
11. Google Services Integration
12. Authentication and Security
13. Environment Variables
14. Local Setup and Run
15. Testing and Validation
16. Deployment
17. Advantages and Value
18. Current Limitations / What Is Still Missing
19. What You Might Have Missed in This Project
20. Suggested Next Improvements
21. Project Structure
22. Team and Credits
23. License

---

## 2) What This Project Is and Is Not

### This project is

- A multi-agent, LLM-powered productivity planner.
- A modular FastAPI backend with 20+ routers.
- A React TypeScript frontend with protected pages and feature modules.
- A Neon PostgreSQL-backed multi-user system.
- A Google-integrated live data planner (Calendar, Tasks, Gmail, Contacts, Maps, Sheets, Notes).

### This project is not

- Just a static to-do app.
- Just a single prompt chatbot.
- A fully autonomous executor that performs irreversible actions without user control.
- A final production-hardened enterprise system (yet).

---

## 3) Why This Project

### Real problem

People manage daily work in fragmented tools:

- calendar app for events
- task app for todos
- email for action items
- maps for travel
- notes/spreadsheets for context

This creates manual overhead and missed priorities.

### Project objective

Unify these signals into one reasoning pipeline that answers:

- What should I do first?
- Where are my conflicts?
- How much time is consumed by travel?
- What is the most realistic plan for today?

---

## 4) What We Built (Complete Scope)

### Core capabilities

- Dual planning modes (manual and live).
- 10-agent live orchestration and 6-agent manual orchestration.
- JWT-based multi-user authentication.
- Google OAuth connect/disconnect flow.
- Persistent AI plans and per-agent logs.
- Dashboard analytics and productivity metrics.
- Chatbot with model fallback strategy.
- Voice assistant with premium TTS fallback to browser TTS.

### Product surfaces delivered

- Planning workspace
- Dashboard and insights
- Calendar, email, tasks, contacts, maps, sheets, notes pages
- Chat and voice interfaces
- Project/task CRUD pages
- Settings and Google connect pages

---

## 5) Architecture

### High-level architecture

```text
React Frontend (TypeScript)
        |
        | HTTP/JSON + Bearer JWT
        v
FastAPI Backend (Routers + Services + Middleware)
        |
        | invokes
        v
LangGraph ScheduleAgentGraph
  - Manual graph (6 stages)
  - Live graph (10 stages)
        |
        | reads/writes
        v
Neon PostgreSQL (SQLAlchemy + Alembic)
        |
        | external integrations
        v
Google APIs + LLM Providers (Groq, Gemini, OpenRouter)
```

### Execution modes

Manual mode:

- Input: user-provided date, meetings, tasks
- Output: conflict/travel/optimized plan/final summary

Live mode:

- Input: authenticated user with Google connection
- Output: auto-fetched Google context + optimized plan + summary

---

## 6) Agent Pipelines

### Manual pipeline (6 stages)

1. CalendarAgent
2. TaskAgent
3. ConflictAgent
4. TravelAgent
5. PlanningAgent
6. CoordinatorAgent

### Live pipeline (10 stages)

1. Calendar fetch + analyze
2. Tasks fetch + analyze
3. Email fetch + analyze
4. Contacts fetch + enrich
5. Sheets fetch + analyze (optional by config)
6. Travel analysis
7. Conflict detection
8. Plan optimization
9. Notes synthesis
10. Coordinator final response

### Why multi-agent here

- specialization per concern
- better modularity
- easier debugging and extension
- better explainability versus one giant prompt

---

## 7) Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- LangChain + LangGraph
- Pydantic
- python-jose + bcrypt
- Google API Python Client

### Frontend

- React 19
- TypeScript
- React Router
- Zustand
- Axios
- Tailwind CSS
- Framer Motion
- Recharts

### Data and infrastructure

- Neon PostgreSQL
- Render deployment config for backend
- Vercel deployment config for frontend

### LLM providers and fallback

- Primary: Groq (Llama 3.3 70B)
- Optional/fallback: Google Gemini 2.5 Flash / Flash Lite
- Optional/fallback: OpenRouter models

---

## 8) Frontend (Complete)

### Route map (implemented)

Public:

- /
- /login
- /register
- /privacy
- /terms

Protected:

- /dashboard
- /planner
- /history
- /calendar
- /email
- /tasks
- /contacts
- /maps
- /sheets
- /chatbot
- /voice-assistant
- /settings
- /notes
- /insights
- /google-connect

### Main frontend modules (implemented)

- Auth module (JWT + Google login flows)
- Planner module (manual/live run, timeline, result tabs)
- Dashboard module (KPIs, readiness, timeline, insights)
- Chat module (context-aware assistant, sessions, model picker)
- Voice module (STT/TTS, fallback behavior)
- Calendar/email/tasks/contacts/maps/sheets/notes modules
- History + insights modules
- Theme and settings module

### State management and API handling

- Axios interceptor injects Bearer token from localStorage key g-one_token.
- Zustand stores for auth, planner, dashboard, theme, context/sync.

---

## 9) Backend (Complete)

### Core backend components

- App bootstrapping and router mounting: backend/main.py
- Agent orchestration graph: backend/graph/agent_graph.py
- Agent implementations: backend/agents/*.py
- Routers: backend/routers/*.py
- Integration utilities: backend/utils/google_*.py
- Auth services: backend/services/auth_service.py
- Middleware and error handlers: backend/middleware/*.py

### Router groups (implemented)

- auth_router
- db_auth_router
- planner_router
- chatbot_router
- chat_history_router
- voice_router
- dashboard_router
- calendar_router
- email_router
- tasks_router
- contacts_router
- maps_router
- sheets_router
- notes_router
- meetings_router
- projects_router
- db_tasks_router
- settings_router
- metrics_router
- ai_plans_router
- agent_logs_router

### Reliability behavior

- global exception handlers
- per-agent fallback outputs when LLM/API fails
- chatbot multi-model fallback sequencing

---

## 10) Database and Data Model

### Core entities

- users
- projects
- tasks
- chat_sessions

### Integration and personalization

- google_tokens
- meetings
- user_settings

### AI persistence and observability

- ai_plans
- agent_logs

### Analytics and routes

- productivity_metrics
- saved_routes

### Key benefits of this model

- persistent plan history
- auditability via agent logs
- per-user personalization
- dashboard analytics readiness

---

## 11) API Catalog (Complete)

Most endpoints below are mounted under /api. System endpoints remain / and /docs.

### System

- GET /
- Swagger docs: /docs

### Authentication and identity

- GET /api/auth/google
- GET /api/auth/google-connect
- GET /api/auth/google/callback
- GET /api/auth/status
- POST /api/auth/logout
- POST /api/db-auth/register
- POST /api/db-auth/login
- GET /api/db-auth/me
- POST /api/db-auth/google-login

### Planner and AI outputs

- POST /api/plan-day-live
- POST /api/plan-day
- GET /api/last-output
- POST /api/ai-plans
- GET /api/ai-plans
- GET /api/ai-plans/{plan_id}
- DELETE /api/ai-plans/{plan_id}
- POST /api/agent-logs
- GET /api/agent-logs
- GET /api/agent-logs/plan/{plan_id}

### Chatbot and history

- GET /api/chatbot/context-snapshot
- GET /api/chatbot/available-models
- POST /api/chatbot/ask
- GET /api/chat-history/sessions
- POST /api/chat-history/sessions
- GET /api/chat-history/sessions/{session_id}
- DELETE /api/chat-history/sessions/{session_id}
- DELETE /api/chat-history/sessions

### Voice

- GET /api/voice/status
- GET /api/voice/settings
- GET /api/voice/voices
- POST /api/voice/tts

### Dashboard and metrics

- GET /api/dashboard/summary
- POST /api/metrics
- GET /api/metrics
- GET /api/metrics/latest

### Project and DB task management

- GET /api/projects
- POST /api/projects
- GET /api/projects/{project_id}
- PUT /api/projects/{project_id}
- DELETE /api/projects/{project_id}
- GET /api/db-tasks
- POST /api/db-tasks
- GET /api/db-tasks/{task_id}
- PUT /api/db-tasks/{task_id}
- DELETE /api/db-tasks/{task_id}

### Settings

- GET /api/settings
- PUT /api/settings

### Calendar

- GET /api/calendar/events
- GET /api/calendar/events/range
- POST /api/calendar/events

### Email

- GET /api/email/inbox
- GET /api/email/message/{message_id}
- GET /api/email/{message_id}
- POST /api/email/send

### Tasks and notes via Google Tasks

- GET /api/tasks/list
- GET /api/tasks/lists
- POST /api/tasks/create
- POST /api/tasks
- PUT /api/tasks/complete/{task_id}
- POST /api/tasks/{task_id}/complete
- DELETE /api/tasks/{task_id}
- GET /api/tasks/notes
- POST /api/tasks/notes
- DELETE /api/tasks/notes/{note_id}

### Contacts

- GET /api/contacts
- GET /api/contacts/search

### Maps and saved routes

- GET /api/maps/directions
- GET /api/maps/distance
- GET /api/maps/geocode
- GET /api/maps/reverse
- GET /api/maps/suggest
- GET /api/maps/saved-routes
- POST /api/maps/saved-routes
- DELETE /api/maps/saved-routes/{route_id}

### Sheets

- GET /api/sheets/list
- GET /api/sheets/{spreadsheet_id}/tabs
- GET /api/sheets/{spreadsheet_id}
- POST /api/sheets/{spreadsheet_id}
- POST /api/sheets/{spreadsheet_id}/append

### Notes

- GET /api/notes
- POST /api/notes
- PUT /api/notes/{note_id}
- DELETE /api/notes/{note_id}

### Meetings

- POST /api/meetings/sync
- GET /api/meetings

---

## 12) Google Services Integration

### Connected services

- Google Calendar
- Google Tasks
- Gmail
- Google Contacts (People API)
- Google Sheets
- Google Maps
- Google Notes (implemented using dedicated Google Tasks list)

### How Google connection works

1. User authenticates into app (JWT).
2. User connects Google via /api/auth/google or /api/auth/google-connect.
3. Backend exchanges auth code and stores tokens in google_tokens table.
4. Backend refreshes token when needed.
5. Live mode and service routes read Google data using per-user credentials.

### How each Google service is used

- Calendar: fetch events, detect density/conflicts, sync meetings.
- Tasks: fetch pending items, task list operations, notes workaround list.
- Gmail: unread and recent mail context for prioritization.
- Contacts: attendee enrichment and people lookup.
- Sheets: optional insights extraction if spreadsheet configured.
- Maps: directions, geocoding, route estimates; includes fallback behavior.
- Notes: quick note persistence and retrieval via tasks list.

---

## 13) Authentication and Security

### Implemented

- JWT bearer auth for protected routes.
- Role field in user model (USER/ADMIN enum support).
- Per-user data isolation in route queries.
- OAuth token refresh handling.
- Global error handlers for DB/integrity/general exceptions.

### Important security notes

- Use strong JWT secret in production.
- Do not commit real credentials or token files.
- Restrict ALLOWED_ORIGINS in production.
- Move secrets to platform secret manager.

---

## 14) Environment Variables

Create backend/.env from backend/.env.example.

### Required backend variables

- DATABASE_URL
- JWT_SECRET_KEY
- At least one LLM key:
  - GROQ_API_KEY, or
  - GOOGLE_API_KEY, or
  - OPENROUTER_API_KEY

### Backend optional but common

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_MAPS_API_KEY
- GOOGLE_SHEETS_ID
- ALLOWED_ORIGINS
- JWT_EXPIRE_MINUTES
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID
- ELEVENLABS_MODEL_ID

### Frontend variables

Create frontend/.env (or frontend/.env.local):

```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id
REACT_APP_MAPS_EMBED_KEY=optional_embed_key
```

---

## 15) Local Setup and Run

### Backend setup (Windows PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn main:app --reload
```

Backend URLs:

- Root: http://127.0.0.1:8000/
- Swagger: http://127.0.0.1:8000/docs

### Frontend setup

```powershell
cd frontend
npm install
npm start
```

Frontend URL:

- http://localhost:3000

### CLI mode

```powershell
cd backend
.\venv\Scripts\activate
python cli.py
```

CLI supports manual scenarios and live mode.

---

## 16) Testing and Validation

### Core validation checklist

1. API health and docs load.
2. Register/login and /api/db-auth/me.
3. Manual plan generation at /api/plan-day.
4. Live plan generation at /api/plan-day-live (with Google connected).
5. Chatbot ask route and context snapshot.
6. Dashboard summary route.
7. Frontend protected routing behavior.
8. Migration flow via alembic upgrade head.

### Useful guides

- docs/guides/QUICKSTART.md
- docs/guides/RUN_GUIDE.md
- docs/guides/COMPLETE_RUN_GUIDE.md
- docs/guides/TESTING_GUIDE.md

### Additional archived evaluation artifacts

- archive/backend/benchmark_models.py
- archive/backend/test_cache.py
- archive/backend/apikey-diagnostics/

---

## 17) Deployment

### Backend

- Config: backend/render.yaml
- Runtime: Python + uvicorn
- Typical platform: Render

### Frontend

- Config: frontend/vercel.json
- Typical platform: Vercel

### Production checklist

- strict ALLOWED_ORIGINS
- secrets in cloud secret manager
- rotate JWT secrets and API keys
- monitor API quotas and failures

---

## 18) Advantages and Value

### Technical advantages

- clear modular architecture
- dual-mode operation (manual + live)
- rich integration layer
- persistent AI and observability data
- fallback-aware chatbot/model behavior

### User advantages

- less manual planning effort
- conflict visibility
- travel-aware recommendations
- single place for planning + context

### Academic/project advantages

- demonstrates complete full-stack engineering
- demonstrates practical multi-agent orchestration
- demonstrates integration and deployment readiness

---

## 19) Current Limitations / What Is Still Missing

This section answers: "What are the main things still missed?"

### Engineering gaps

- Live graph runs sequentially; limited parallel optimization.
- End-to-end automated test coverage is limited (especially backend CI-level tests).
- Response schema between manual and live planner outputs is not fully uniform.

### Security gaps

- Google tokens are persisted without column-level encryption.
- JWT is stored in localStorage (acceptable for prototype, not ideal for hardened production).
- Secret hygiene should be tightened further in repository/deployment workflows.

### Product gaps

- No native mobile client.
- No proactive notification engine (push/email reminder scheduler).
- No long-term personalized memory/ranking beyond current context.

### Code quality/maintenance gaps observed

- Duplicate helper definitions exist in backend/utils/google_auth.py.
- CLI default-user creation path uses full_name field (mismatch with User model field naming).

---

## 20) What You Might Have Missed in This Project

If you are explaining this project to another AI or evaluator, these are often overlooked but important:

1. This is not only a chatbot. It is a full planning platform with persistent data.
2. The planner has two separate pipelines with different depth and data sources.
3. Dashboard uses both Google data and DB analytics (hybrid metrics).
4. Notes integration is implemented via Google Tasks list strategy.
5. Maps supports fallback behavior, not only direct paid API path.
6. Chatbot has model availability and fallback logic, not single-model dependency.
7. Voice has premium TTS path plus browser fallback.
8. Agent logs and AI plan storage exist for observability/history.

---

## 21) Suggested Next Improvements (Priority Order)

1. Normalize API response contracts across planner endpoints.
2. Refactor duplicate utility definitions and fix CLI user-field mismatch.
3. Add backend automated test suite and CI checks.
4. Add token encryption at rest and stronger secret management.
5. Parallelize independent live graph stages.
6. Add notification scheduler and proactive recommendations.
7. Add personalization memory and confidence scoring.

---

## 22) Project Structure

```text
Personal_Task/
|-- backend/
|   |-- agents/                  # AI agent logic
|   |-- graph/                   # LangGraph workflows
|   |-- routers/                 # REST APIs
|   |-- database/                # models, schemas, connection
|   |-- middleware/              # auth and error handling
|   |-- services/                # auth service layer
|   |-- utils/                   # Google + helper utilities
|   |-- prompts/                 # per-agent prompts
|   |-- data/                    # sample scenarios
|   |-- alembic/                 # migrations
|   |-- main.py
|   |-- cli.py
|   `-- requirements.txt
|
|-- frontend/
|   |-- src/
|   |   |-- app/                 # router/layout
|   |   |-- features/            # page modules
|   |   |-- hooks/               # reusable logic
|   |   |-- services/            # API clients
|   |   |-- store/               # Zustand stores
|   |   `-- utils/
|   |-- public/
|   |-- package.json
|   `-- vercel.json
|
|-- docs/
|   |-- architecture/
|   |-- guides/
|   |-- research/
|   `-- FINAL_YEAR_PROJECT_REPORT.md
|
`-- archive/
    |-- backend/
    `-- frontend/
```

---

## 23) Team and Credits

| Name         | Primary Role                        |
|--------------|-------------------------------------|
| Arunkumar L  | Backend and AI Agent Development    |
| Aishwariya D | Frontend Development                |
| Suganya U    | Testing and Validation              |
| Mukilan S    | Documentation and Research          |

---

## 24) License

Academic project developed for final-year coursework.

