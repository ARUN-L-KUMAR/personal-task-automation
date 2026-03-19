# G-ONE - AI Personal Task Automation Platform

G-ONE is a full-stack, AI-powered productivity system designed to automate daily planning by combining a cooperative multi-agent backend with a modern web interface.

The project supports two real-world operating styles:

1. Manual planning mode where users provide meetings and tasks.
2. Live Google mode where the system fetches real data from connected Google services and plans automatically.

This README is intentionally detailed so that any new developer, evaluator, or collaborator can understand the system architecture, setup, data flow, and usage without prior project context.

## Table of Contents

1. Project Vision
2. What Problem This Solves
3. Core Capabilities
4. System Architecture
5. Agent Pipeline and Responsibilities
6. Backend Design
7. Frontend Design
8. Database Design
9. Authentication and Security Flow
10. Environment Variables
11. Local Setup and Run Guide
12. API Reference (Grouped)
13. End-to-End Usage Examples
14. Testing and Validation
15. Troubleshooting
16. Deployment Notes
17. Project Structure
18. Team and Credits

## 1. Project Vision

G-ONE aims to move beyond static task lists by acting as an intelligent assistant that can:

- Understand schedules and deadlines.
- Detect conflicts early.
- Suggest realistic plans including travel and context.
- Explain recommendations in natural language.

The architecture is built for cooperative intelligence, where specialized agents contribute partial analysis and a coordinator agent synthesizes final guidance.

## 2. What Problem This Solves

Most productivity apps store tasks and events but do not reason across them. Users still manually answer questions like:

- Which task should I do first?
- Will my deadlines clash with my meetings?
- How much travel time do I need?
- What should I focus on for today?

G-ONE addresses this by combining scheduling data, task urgency, communication signals, and travel context into one AI-generated action plan.

## 3. Core Capabilities

- Dual-mode planning:
  - Manual input mode (meetings and tasks provided by user).
  - Live mode (Google Calendar, Gmail, Tasks, Contacts, Maps, Sheets, and Notes context).
- Multi-agent orchestration using LangGraph.
- Conflict detection and severity assessment.
- Travel-aware schedule optimization.
- User-specific persistence for plans, logs, metrics, settings, and saved routes.
- JWT-protected multi-user APIs.
- Rich frontend modules for planning, history, chatbot, voice, insights, and administration.

## 4. System Architecture

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
  - Manual pipeline (6-stage)
  - Live pipeline (10-stage)
        |
        | reads/writes
        v
Neon PostgreSQL (SQLAlchemy + Alembic)
        |
        | external integrations
        v
Google APIs + LLM Providers (Groq, Gemini, OpenRouter)
```

### Operational modes

1. Manual mode:
  - Input: date + meetings + tasks from user.
  - Output: conflict analysis, travel reminders, optimized plan, AI explanation.

2. Live mode:
  - Input: authenticated user only.
  - System auto-fetches Google data, then runs full analysis pipeline.
  - Output includes Google-derived analysis and optimization artifacts.

## 5. Agent Pipeline and Responsibilities

The graph supports two pipelines.

### Manual pipeline (6 stages)

1. CalendarAgent: analyzes meeting structure and time density.
2. TaskAgent: analyzes urgency, deadlines, and workload profile.
3. ConflictAgent: detects overlap and deadline pressure.
4. TravelAgent: estimates travel implications from meeting locations.
5. PlanningAgent: creates optimized schedule and recommendations.
6. CoordinatorAgent: generates user-facing explanation and summary.

### Live pipeline (10 stages)

1. Calendar fetch and analysis.
2. Task fetch and analysis.
3. Email fetch and signal extraction.
4. Contact enrichment.
5. Sheets insight extraction (optional if configured).
6. Travel analysis using map context.
7. Conflict detection.
8. Plan optimization.
9. Notes synthesis.
10. Final coordination response.

## 6. Backend Design

Backend stack:

- FastAPI for API layer.
- SQLAlchemy ORM + Alembic migrations.
- JWT auth middleware for route protection.
- Modular routers in backend/routers.
- LangGraph-based orchestration in backend/graph/agent_graph.py.

Important backend entry points:

- backend/main.py: app creation, CORS, error handlers, router registration.
- backend/cli.py: interactive CLI mode for manual and live runs.
- backend/config/settings.py: model setup and fallback definitions.

Error handling:

- Global exception handlers are registered for generic exceptions and database errors.
- API responses use explicit HTTP status codes and structured detail fields.

## 7. Frontend Design

Frontend stack:

- React 19 + TypeScript.
- React Router for route-level navigation.
- Tailwind CSS for styling.
- Zustand store + service layer for state/API integration.
- Axios wrapper with JWT interceptor.

Frontend architecture highlights:

- Protected routes wrapped with AuthGuard.
- Token stored in localStorage as g-one_token.
- API base URL configured using REACT_APP_API_BASE_URL.
- Google OAuth client injected at app root.

Major feature pages:

- Landing, Login, Register.
- Dashboard, Planner, History, Insights.
- Calendar, Email, Tasks, Contacts, Maps, Sheets.
- Chatbot, Voice Assistant.
- Notes, Settings, Google Connect.

## 8. Database Design

The backend ORM models include core, integration, AI persistence, and analytics tables.

Primary entities include:

- users
- projects
- tasks
- chat_sessions
- google_tokens
- meetings
- user_settings
- ai_plans
- agent_logs
- productivity_metrics
- saved_routes

Key data goals:

- Persist generated AI plans per user and date.
- Retain per-agent execution logs for observability.
- Support dashboard analytics and history views.
- Maintain per-user settings and personalization metadata.

## 9. Authentication and Security Flow

G-ONE uses JWT Bearer authentication for protected routes.

Flow summary:

1. User registers or logs in via /api/db-auth.
2. Backend returns access_token.
3. Frontend stores token in localStorage and sends it in Authorization header.
4. Backend middleware validates token and resolves current user.
5. Protected routes enforce authentication automatically.

Google integration:

- Supports Google OAuth flow.
- Access and refresh tokens are stored in database token tables.
- Live planning mode depends on valid Google credentials for user.

## 10. Environment Variables

Create backend/.env from backend/.env.example.

### Required backend variables (recommended minimum)

- DATABASE_URL
- JWT_SECRET_KEY
- At least one LLM provider key:
  - GROQ_API_KEY, or
  - GOOGLE_API_KEY, or
  - OPENROUTER_API_KEY

### Common backend optional variables

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

## 11. Local Setup and Run Guide

### A. Backend setup (Windows PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit backend/.env with your keys and database URL.

Run migrations:

```powershell
alembic upgrade head
```

Start backend:

```powershell
uvicorn main:app --reload
```

Backend endpoints:

- Root: http://127.0.0.1:8000/
- Swagger: http://127.0.0.1:8000/docs

### B. Frontend setup

```powershell
cd frontend
npm install
npm start
```

Frontend URL:

- http://localhost:3000

### C. CLI mode (optional but useful)

```powershell
cd backend
.\venv\Scripts\activate
python cli.py
```

CLI supports manual input, sample scenarios, and Google live mode.

## 12. API Reference (Grouped)

All routers are mounted under /api except root and docs.

### 12.1 Auth and identity

- POST /api/db-auth/register
- POST /api/db-auth/login
- GET /api/db-auth/me
- POST /api/db-auth/google-login
- GET /api/auth/google
- GET /api/auth/google-connect
- GET /api/auth/google/callback
- GET /api/auth/status
- POST /api/auth/logout

### 12.2 Planning and AI output

- POST /api/plan-day
- POST /api/plan-day-live
- GET /api/last-output
- CRUD /api/ai-plans
- CRUD /api/agent-logs

### 12.3 Productivity and dashboard

- GET /api/dashboard/summary
- POST /api/metrics
- GET /api/metrics
- GET /api/metrics/latest

### 12.4 Task and project management

- CRUD /api/projects
- CRUD /api/db-tasks
- Google task routes under /api/tasks

### 12.5 Communication and assistant

- POST /api/chatbot/ask
- GET /api/chatbot/context-snapshot
- GET /api/chatbot/available-models
- Chat history session routes under /api/chat-history
- Voice routes under /api/voice

### 12.6 Google data access routes

- Calendar routes under /api/calendar
- Email routes under /api/email
- Contacts routes under /api/contacts
- Sheets routes under /api/sheets
- Maps routes under /api/maps

### 12.7 User workspace and personalization

- GET/PUT /api/settings
- CRUD /api/notes
- Meeting sync/list routes under /api/meetings

## 13. End-to-End Usage Examples

### Example 1: Manual planning flow

1. Register or login to obtain JWT.
2. Send POST /api/plan-day with Bearer token and schedule payload.
3. Backend runs manual graph and stores plan in ai_plans.
4. View results in planner UI or fetch latest plan.

Sample request body:

```json
{
  "date": "2026-03-19",
  "meetings": [
    {
      "title": "Project Review",
      "startTime": "10:00",
      "endTime": "11:00",
      "location": "Campus Lab",
      "isFlexible": false,
      "priority": "high"
    }
  ],
  "tasks": [
    {
      "title": "Finalize Presentation",
      "duration": 90,
      "deadline": "16:00",
      "requiresTravel": false,
      "flexibleDeadline": false,
      "category": "work",
      "priority": "high"
    }
  ]
}
```

### Example 2: Live planning flow

1. Connect Google account.
2. Send POST /api/plan-day-live with Bearer token.
3. Backend fetches live data and runs 10-stage graph.
4. Response includes google_emails, google_contacts, google_sheets, google_notes, conflicts, travel_plan, optimized_plan, and final_response.

## 14. Testing and Validation

Recommended validation checklist:

1. Backend health check at root endpoint.
2. Login/register and /api/db-auth/me verification.
3. Manual plan generation via /api/plan-day.
4. Chatbot route /api/chatbot/ask with authenticated user.
5. Frontend protected route behavior after token removal.
6. Migration integrity using alembic upgrade head.

Additional guides are available in docs/guides:

- docs/guides/QUICKSTART.md
- docs/guides/RUN_GUIDE.md
- docs/guides/COMPLETE_RUN_GUIDE.md
- docs/guides/TESTING_GUIDE.md

## 15. Troubleshooting

### Problem: 401 Invalid or expired token

- Re-login and ensure Authorization header uses Bearer token.
- Confirm frontend token key is present (g-one_token).

### Problem: Google live mode says not connected

- Reconnect Google account using auth routes.
- Verify GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET configuration.
- Ensure saved Google token exists for current user.

### Problem: LLM responses failing or slow

- Confirm at least one model API key is valid.
- Check provider limits (free-tier rate limits are common).
- Try chatbot auto-model fallback mode.

### Problem: CORS errors on frontend

- Add frontend origin to ALLOWED_ORIGINS in backend .env.
- Restart backend after env changes.

### Problem: Database connection errors

- Verify DATABASE_URL format and credentials.
- Ensure database is reachable from your machine.
- Run alembic upgrade head after schema changes.

## 16. Deployment Notes

- Backend deployment config exists in backend/render.yaml.
- Frontend deployment config exists in frontend/vercel.json.
- For production:
  - Use strong JWT_SECRET_KEY.
  - Set strict ALLOWED_ORIGINS.
  - Store keys securely using platform secret managers.

## 17. Project Structure

```text
Personal_Task/
|-- backend/
|   |-- agents/                 # individual AI agent logic
|   |-- graph/                  # LangGraph orchestration
|   |-- routers/                # API route modules
|   |-- database/               # connection, models, schemas
|   |-- services/               # auth and utility services
|   |-- middleware/             # auth and exception middleware
|   |-- prompts/                # prompt templates per agent
|   |-- data/                   # sample and seed data
|   |-- scripts/maintenance/    # maintenance utilities
|   |-- main.py                 # FastAPI app entrypoint
|   |-- cli.py                  # interactive command-line runner
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- app/                # router and layout
|   |   |-- features/           # page-level modules
|   |   |-- hooks/              # reusable app hooks
|   |   |-- services/           # API/service adapters
|   |   |-- store/              # global state management
|   |   `-- utils/
|   |-- public/
|   `-- package.json
|-- docs/
|   |-- architecture/
|   |-- guides/
|   |-- migrations/
|   `-- research/
`-- archive/
```

## 18. Team and Credits

| Name         | Role                              |
|--------------|-----------------------------------|
| Arunkumar L  | Backend and AI Agent Development  |
| Aishwariya D | Frontend Development              |
| Suganya U    | Testing and Validation            |
| Mukilan S    | Documentation and Research        |

## License

Academic project developed for final-year coursework.
