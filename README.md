# G-ONE - AI Personal Task Automation

G-ONE is a full-stack AI productivity platform that combines a LangGraph multi-agent backend with a modern React frontend. It can run in manual planning mode or pull live Google data (Calendar, Tasks, Gmail, Contacts, Maps, Sheets, Notes) to generate optimized daily plans, detect conflicts, and produce actionable summaries.

## What's Updated in This Version

- Dual-mode agent orchestration:
  - Manual mode with user-provided meetings/tasks
  - Live mode with connected Google services
- Expanded multi-agent pipeline (up to 10 agents in live mode)
- JWT-based multi-user backend with Neon PostgreSQL + SQLAlchemy
- Feature-rich frontend modules (dashboard, planner, chatbot, voice, maps, insights, notes, and more)
- Persistent plan/history/metrics/settings APIs

## Key Features

- AI planning pipeline with LangChain + LangGraph
- Conflict detection and travel-aware scheduling
- Google OAuth integration for live data sync
- REST API with FastAPI + interactive docs
- Web dashboard for planning, analytics, and assistant workflows
- Voice assistant integration endpoint support

## Architecture Overview

### Manual Mode (6-node flow)

1. Analyze calendar input
2. Analyze task input
3. Detect conflicts
4. Plan travel
5. Create optimized plan
6. Generate coordinator response

### Live Mode (10-node flow)

1. Fetch calendar
2. Fetch tasks
3. Fetch emails
4. Fetch contacts
5. Fetch sheets
6. Analyze travel
7. Detect conflicts
8. Create optimized plan
9. Generate notes
10. Generate coordinator response

## Tech Stack

- Frontend: React 19, TypeScript, React Router, Tailwind CSS, Framer Motion, Recharts
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic
- AI: LangChain, LangGraph, OpenRouter/Groq/Google model integrations
- Auth and Data: JWT auth, Google OAuth, Neon PostgreSQL

## Project Structure

```text
Personal_Task/
|-- backend/
|   |-- agents/
|   |-- graph/
|   |-- routers/
|   |-- database/
|   |-- services/
|   |-- prompts/
|   |-- data/
|   |-- main.py
|   |-- cli.py
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- services/
|   |   `-- store/
|   `-- package.json
|-- docs/
|   |-- architecture/
|   |-- guides/
|   |-- migrations/
|   `-- research/
`-- archive/
```

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- A PostgreSQL database URL (Neon recommended)
- API keys for at least one LLM provider

## Environment Setup

### 1. Backend environment

From the backend folder, copy the example env file and fill values:

```powershell
cd backend
Copy-Item .env.example .env
```

Minimum required values for local development:

- OPENROUTER_API_KEY (or alternative model keys used in config)
- DATABASE_URL
- JWT_SECRET_KEY
- GOOGLE_MAPS_API_KEY (for maps/travel features)

Commonly used optional values:

- GOOGLE_API_KEY
- GROQ_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_SHEETS_ID
- ALLOWED_ORIGINS
- ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID

### 2. Frontend environment

Create frontend/.env (or .env.local) with:

```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
REACT_APP_MAPS_EMBED_KEY=your_maps_embed_key_optional
```

## Local Development

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend URLs:

- API root: http://127.0.0.1:8000/
- Swagger docs: http://127.0.0.1:8000/docs

### Frontend

```powershell
cd frontend
npm install
npm start
```

Frontend URL:

- http://localhost:3000

## Database Migrations

```powershell
cd backend
.\venv\Scripts\activate
alembic upgrade head
```

## Main API Route Groups

All backend routers are mounted under /api.

- /api/planner endpoints:
  - POST /api/plan-day
  - POST /api/plan-day-live
  - GET /api/last-output
- /api/db-auth, /api/projects, /api/db-tasks
- /api/calendar, /api/email, /api/contacts, /api/tasks, /api/maps, /api/sheets
- /api/chatbot, /api/voice, /api/chat-history
- /api/dashboard, /api/metrics, /api/ai-plans, /api/agent-logs, /api/settings, /api/notes, /api/meetings

Use /docs to explore payloads and responses interactively.

## CLI Mode (Backend)

The backend also includes an interactive CLI:

```powershell
cd backend
.\venv\Scripts\activate
python cli.py
```

CLI supports:

- Manual schedule input
- Sample scenarios
- Google live mode
- Google connect/disconnect checks

## Frontend Modules

Major pages currently include:

- Landing, Login, Register
- Dashboard and Insights
- Planner and History
- Calendar, Email, Tasks, Contacts, Maps, Sheets
- Chatbot and Voice Assistant
- Notes and Settings

## Deployment Notes

- Backend includes Render configuration (backend/render.yaml)
- Frontend includes Vercel SPA rewrite config (frontend/vercel.json)

## Documentation

Guides are available in docs/guides:

- docs/guides/QUICKSTART.md
- docs/guides/RUN_GUIDE.md
- docs/guides/COMPLETE_RUN_GUIDE.md
- docs/guides/TESTING_GUIDE.md

Additional technical docs:

- docs/architecture/
- docs/migrations/
- docs/research/

## Team

| Name         | Role                           |
|--------------|--------------------------------|
| Arunkumar L  | Backend and AI Agent Development |
| Aishwariya D | Frontend Development           |
| Suganya U    | Testing and Validation         |
| Mukilan S    | Documentation and Research     |

## License

Academic project for final-year coursework.
