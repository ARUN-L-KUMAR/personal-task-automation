# Agentic AI for Personal Task Planning and Schedule Optimization (G-ONE)
## Final Year Project Report

Department of Computer Science and Engineering  
University College of Engineering Kancheepuram  
April/May 2026 Examination

Submitted by:
1. Arunkumar L (513422104704)
2. Mukilan S (513422104036)
3. Suganya U (513422104042)
4. Aishwariya D (513422104011)

Guided by: Dr. V. Kavitha, Professor

---

## Certificate (Template)

This is to certify that the project report titled "Agentic AI for Personal Task Planning and Schedule Optimization (G-ONE)" is a bonafide record of work carried out by the above students in partial fulfillment of the requirements for the award of Bachelor of Engineering in Computer Science and Engineering.

Guide Signature: ____________________  
Head of Department Signature: ____________________  
External Examiner Signature: ____________________

Date: ____________________

---

## Declaration

We hereby declare that this report and the project work presented in it are original and have been carried out by us under the supervision of our guide. The content has not been submitted previously for any degree or diploma award.

Student Signatures:
1. ____________________
2. ____________________
3. ____________________
4. ____________________

---

## Acknowledgement

We sincerely thank our guide, Dr. V. Kavitha, for her guidance, feedback, and continuous encouragement throughout this project. We thank the faculty members of the Department of Computer Science and Engineering for technical support and review inputs during phase evaluations. We also thank our institution for providing the infrastructure required to implement and test a full-stack AI system.

We acknowledge the open-source communities behind FastAPI, React, LangChain, LangGraph, SQLAlchemy, and other software tools used in this work. We also thank our peers for valuable testing support and user-level feedback that helped improve usability and reliability.

---

## Abstract

This project presents G-ONE, an AI-assisted personal productivity platform built using a cooperative multi-agent architecture. The system addresses a practical problem: users manage meetings, tasks, emails, travel, and notes across multiple disconnected applications, resulting in manual effort, missed priorities, and poor schedule quality. G-ONE unifies these information streams and produces actionable daily plans using a modular agent workflow.

The implementation includes a FastAPI backend, a React TypeScript frontend, LangGraph-based orchestration, and Neon PostgreSQL persistence. Ten specialized agents collaborate in live mode by combining calendar, task, email, contact, sheet, note, travel, conflict, planning, and coordination capabilities. A six-stage manual mode is also provided for situations where users directly input meetings and tasks. The system supports authenticated multi-user operation via JWT, Google OAuth-based data integration, and database-backed plan history, metrics, and execution logs.

The project integrates practical engineering features such as model fallback chains, API-level error handling, context caching, role-based module separation, voice assistant support, and dashboard analytics. In addition to implementation, this report documents architecture rationale, module design, database schema, API coverage, testing strategy, results interpretation, deployment configuration, and limitations.

The developed system demonstrates that multi-agent AI methods can be adapted from research settings into a real-world personal productivity assistant with measurable utility. The final platform supports both demonstration and future extension into deeper automation, proactive notifications, and adaptive personalization.

Keywords: Multi-agent systems, personal task automation, LangGraph, LLM-assisted planning, FastAPI, React, Google API integration, productivity analytics.

---

## Table of Contents

1. Introduction  
2. Review Evolution and Literature Survey  
3. Problem Definition, Objectives, and Scope  
4. Requirement Analysis and Feasibility  
5. System Architecture and Design  
6. Backend Design and Implementation  
7. Frontend Design and Implementation  
8. Database Design  
9. Security, Authentication, and Privacy  
10. Testing, Validation, and Evaluation  
11. Deployment and Operations  
12. Results, Discussion, and Limitations  
13. Conclusion and Future Enhancements  
14. References  
15. Appendices

---

## Target Page Plan (Minimum 60 Pages Compliance)

To satisfy institutional minimum length, this report is structured for 65-75 pages after formatting in standard academic style (A4, 12 pt, 1.5 line spacing, figure tables, screenshots):

- Front matter (title, certificate, declaration, acknowledgement, abstract, TOC): 6-8 pages
- Chapters 1-4: 14-18 pages
- Chapters 5-8: 20-24 pages
- Chapters 9-12: 12-15 pages
- Chapters 13-14: 4-5 pages
- Appendices (API catalog, schema catalog, screenshots, user manual, viva prep): 10-15 pages

---

# 1. Introduction

## 1.1 Background

Personal productivity tools are abundant, but they are typically fragmented. A user may maintain events in a calendar app, tasks in a to-do tool, important communication in email, and travel details in maps. Most tools are data stores rather than reasoning systems. They record information but do not synthesize it into context-aware plans.

Recent improvements in LLM-driven systems enable semantic interpretation, summarization, and recommendation. However, single-agent LLM calls are often insufficient for complex workflows involving heterogeneous data sources. This motivated the use of a cooperative multi-agent model where each agent performs a specialized function and contributes structured intermediate outputs.

## 1.2 Project Motivation

The motivation for G-ONE is to transform "task listing" into "intelligent task orchestration". The core idea is that planning quality improves when schedule density, deadline urgency, communication signals, and travel constraints are analyzed together.

## 1.3 Project Title

Agentic AI for Personal Task Planning and Schedule Optimization (G-ONE).

## 1.4 Core Novelty

- Practical multi-agent implementation for day planning, not only a conceptual model.
- Dual operation modes:
  - Manual mode for deterministic test and controlled input.
  - Live mode for auto-fetch and real-world context.
- Full-stack integration with authentication, persistence, analytics, and voice.

## 1.5 Expected Academic Value

This project demonstrates how a research concept (LLM-based multi-agent collaboration) can be translated into a deployable software architecture with modular services, persistence, and user interface.

---

# 2. Review Evolution and Literature Survey

## 2.1 Review 1 Summary (From 1st review.pdf)

The first review documented:

- Problem statement: manual task management across apps is error-prone and time-consuming.
- Initial solution intent: AI-based multi-agent framework integrating Google services.
- Early architecture understanding: conceptual modules and agent roles.
- Scope emphasis: personal use cases, extensibility, and productivity gains.

Observations:

- Review 1 correctly captured motivation and high-level system intent.
- Several modules were still planned rather than fully implemented at that stage.

## 2.2 Review 2 Summary (From 2st review.pdf)

The second review expanded from concept to implementation-level presentation:

- Identified major system modules:
  - Authentication module
  - Task and project management module
  - AI chat assistant module
  - Voice assistant module
  - Chat history management module
  - Backend and database module
- Showed practical UI artifacts such as dashboard, plan-a-day, email, chatbot, and voice screens.

Observations:

- Review 2 reflects transition from prototype architecture to a working platform.
- It introduces clearer module decomposition aligned with the final codebase.

## 2.3 Base Paper Analysis

Base paper reviewed: "Advanced Smart Contract Vulnerability Detection via LLM-Powered Multi-Agent Systems" (IEEE Transactions on Software Engineering, 2025).

Important concepts adopted from the paper:

- Role specialization among agents.
- Collaborative iterative refinement instead of one-shot reasoning.
- Structured process execution across stages.
- Evaluation across datasets with clear metrics.

Reported paper highlights:

- 98% accuracy on common vulnerability benchmark.
- 47.6% on a challenging real-world set with mixed vulnerability types.
- 12/13 CVEs correctly identified in comparative evaluation.
- BA (Broad Analysis) and TA (Targeted Analysis) strategy split.

## 2.4 How the Base Paper Influenced This Project

The project does not copy the smart contract domain. Instead, it transfers the design principle:

- From "single prompt auditing" to "specialized agent collaboration".
- From "single context source" to "multi-source evidence synthesis".
- From "raw answer generation" to "pipeline with structured intermediate artifacts".

Domain adaptation in this project:

- Smart contract auditing domain -> personal productivity domain.
- Vulnerability discovery stages -> schedule-task-conflict-travel-planning stages.
- Agent specialization principle retained and adapted.

## 2.5 Literature Gap and Project Positioning

Gap identified:

- Many productivity apps provide storage and reminders, but limited integrated reasoning.
- Many AI assistants provide chat responses, but not robust multi-service planning pipelines.

Positioning of G-ONE:

- A practical, full-stack, multi-agent productivity orchestration system.
- Balances research-inspired design and software engineering deployability.

---

# 3. Problem Definition, Objectives, and Scope

## 3.1 Problem Definition

Users face three practical pain points:

1. Information fragmentation across calendar, tasks, email, and maps.
2. Manual reasoning burden for prioritization and scheduling.
3. Inability of conventional apps to detect holistic conflicts and opportunities.

## 3.2 Aim

To design and implement an AI-powered cooperative multi-agent system that automates personal day planning by integrating schedule, tasks, communication, and travel context.

## 3.3 Objectives

- Build modular specialized agents with defined responsibilities.
- Implement dual execution pipelines (manual and live data).
- Support multi-user authentication and persistent storage.
- Provide intuitive frontend modules for planning and monitoring.
- Integrate voice and chatbot interfaces for accessibility.
- Validate functionality through scenario-driven and API-level testing.

## 3.4 Scope

In scope:

- Personal planning and daily optimization.
- Google-integrated data fetch and analysis.
- AI-guided recommendations and summaries.
- Plan history and metrics.

Out of scope (current version):

- Fully autonomous action execution without user confirmation.
- Enterprise multi-tenant policy management.
- Mobile-native deployment with push notification stack.
- Formal proof-level correctness guarantees for schedule outputs.

## 3.5 Impact

- Reduces cognitive load in routine planning.
- Improves awareness of deadline and meeting conflicts.
- Supports practical decision-making with context-rich summaries.

---

# 4. Requirement Analysis and Feasibility

## 4.1 Functional Requirements

- User registration and login with JWT.
- Google OAuth connection and status verification.
- Manual day planning endpoint.
- Live day planning endpoint with data auto-fetch.
- Dashboard summary and productivity metrics.
- CRUD for projects, tasks, plans, logs, settings, notes, and meetings.
- Chatbot with context snapshot and model selection.
- Voice assistant with TTS and STT integration paths.

## 4.2 Non-Functional Requirements

- Modular maintainability.
- Reasonable response time for planning and chat flows.
- Secure authentication and route protection.
- Error resilience with fallback behavior.
- Scalability for incremental module extensions.

## 4.3 Technical Feasibility

Feasible because:

- Language and framework maturity (Python + FastAPI + React).
- API availability (Google APIs, LLM providers).
- Cloud deployment targets available (Render and Vercel).
- Existing ORM and migration support (SQLAlchemy + Alembic).

## 4.4 Economic Feasibility

- Uses free/open-source stack for development.
- LLM provider usage can be optimized using fallback and caching.
- Deployment available on free-tier options for demonstration.

## 4.5 Operational Feasibility

- End users interact through familiar UI paradigms.
- Authenticated and guided workflows reduce misuse.
- Manual mode supports usage even without live API connectivity.

---

# 5. System Architecture and Design

## 5.1 High-Level Architecture

Layers:

1. Presentation Layer: React + TypeScript frontend.
2. API Layer: FastAPI routers with JWT dependencies.
3. Orchestration Layer: LangGraph ScheduleAgentGraph.
4. Integration Layer: Google service utilities and LLM providers.
5. Persistence Layer: Neon PostgreSQL via SQLAlchemy.

## 5.2 Dual-Pipeline Graph Design

### Manual Mode (6 stages)

1. Calendar analysis
2. Task analysis
3. Conflict detection
4. Travel planning (estimation/fallback)
5. Plan creation
6. Final coordination response

### Live Mode (10 stages)

1. Calendar fetch and analysis
2. Task fetch and analysis
3. Email fetch and analysis
4. Contacts fetch and matching
5. Sheets fetch and analysis
6. Travel analysis (Maps)
7. Conflict detection
8. Plan creation
9. Notes synthesis
10. Final coordination response

## 5.3 Shared Graph State Design

The state dictionary carries both input and intermediate artifacts:

- mode
- meetings/tasks
- google_emails/google_contacts/google_sheets/google_notes
- calendar_analysis/task_analysis/conflicts/travel_plan/optimized_plan
- final_response
- user/db context

Design benefit:

- Keeps module coupling low while enabling inter-agent data flow.

## 5.4 Design Principles Used

- Separation of concerns by role-based agents.
- Fail-soft behavior via fallback payloads.
- Typed API contracts where needed.
- Progressive enhancement from manual to live mode.

## 5.5 Architecture Notes from Implementation

- Manual and live graphs are separately compiled and invoked.
- Live graph includes graceful handling for optional sheets configuration.
- The planner router persists outputs into AIPlan records in both modes.

---

# 6. Backend Design and Implementation

## 6.1 Backend Stack

- FastAPI
- SQLAlchemy ORM
- Alembic migrations
- LangChain + LangGraph
- JWT auth utilities
- Google API clients

## 6.2 Backend Entry and Router Registration

The backend entry initializes:

- environment loading
- global error handlers
- CORS middleware
- router registration under /api

Router groups include:

- Auth and DB auth
- Planner and chatbot
- Calendar, email, contacts, tasks, maps, sheets, notes
- Dashboard, settings, metrics
- AI plan and agent logs
- Meetings and chat history
- Voice

## 6.3 Agent Layer

### Core planning and synthesis agents

- CalendarAgent: meeting analysis
- TaskAgent: task urgency and workload
- ConflictAgent: overlap and deadline pressure
- TravelAgent: route/time context
- PlanningAgent: optimized schedule output
- CoordinatorAgent: human-readable consolidated response

### Data enrichment agents

- EmailAgent
- ContactsAgent
- SheetsAgent
- NotesAgent

## 6.4 Prompt-Driven Agent Pattern

Common implementation structure:

- load prompt file
- build prompt + llm + parser chain
- invoke with structured input
- return typed output
- fallback if invocation/parsing fails

## 6.5 Planner API Behavior

### POST /api/plan-day-live

- validates Google connectivity
- executes full live graph
- stores AIPlan metadata and outputs
- returns complete response payload with mode metadata

### POST /api/plan-day

- normalizes manual meeting/task fields
- executes manual graph
- stores AIPlan metadata and outputs
- returns response mapping for frontend compatibility

### GET /api/last-output

- returns latest stored plan for current user

## 6.6 Chatbot Router Design

Features:

- context snapshot endpoint
- available model endpoint
- ask endpoint with fallback chain
- per-user cache with TTL
- context source tagging and latency metadata

Fallback strategy includes multiple model/provider combinations based on API key availability and user preference.

## 6.7 Dashboard Router Design

The dashboard combines:

- Google-derived summaries (events, tasks, emails)
- database-derived project/task metrics
- conflict detection and travel estimation
- productivity score and insight generation

## 6.8 Voice Backend

Voice endpoints support:

- status and configuration retrieval
- premium voice list retrieval
- TTS streaming when provider key exists
- graceful fallback path signaled to frontend when unavailable

## 6.9 Error Handling and Reliability

Global handlers map:

- generic exceptions -> 500
- integrity violations -> 409
- DB connection issues -> 503

Many agents and integration utilities provide local fallback outputs to avoid total pipeline failure.

---

# 7. Frontend Design and Implementation

## 7.1 Frontend Stack

- React 19
- TypeScript
- React Router
- Zustand
- Axios
- Tailwind CSS
- Framer Motion
- Recharts

## 7.2 Route Architecture

Public routes:

- landing
- login
- register
- privacy
- terms

Protected routes include:

- dashboard
- planner
- history
- calendar
- email
- tasks
- contacts
- maps
- sheets
- chatbot
- voice assistant
- settings
- notes
- insights
- google-connect

## 7.3 State and API Handling

- API interceptor attaches Bearer JWT from local storage key g-one_token.
- Auth state tracks login, register, me, and logout flows.
- Planner store manages execution phase, agent-step timeline, and result handling.
- Dashboard store provides sequential status animation over fetched data.

## 7.4 Planner UX Design

Planner page supports:

- manual/live mode switch
- animated multi-step timeline
- result tabs and summary strip
- export JSON output
- overload and burnout insight banners

## 7.5 Chat and Voice UX

Chat interface includes:

- quick actions
- slash command support
- model switching and fallback notices
- context snapshot panel
- session history management

Voice integration includes:

- speech-to-text input mode control
- draft versus auto-send behavior
- TTS fallback from premium engine to browser synthesis
- persistent user-level voice preferences

## 7.6 Dashboard and Insights UX

Dashboard presents:

- KPI cards
- module readiness/status strip
- timeline
- conflict and travel indicators
- project analytics widgets

Insights page provides trend charts for:

- productivity score
- tasks completed
- meeting load
- travel minutes

---

# 8. Database Design

## 8.1 Database Technology

- Neon PostgreSQL
- SQLAlchemy ORM mapping
- Alembic migration support

## 8.2 Core Tables

- users
- projects
- tasks
- chat_sessions

## 8.3 Integration and Personalization Tables

- google_tokens
- meetings
- user_settings

## 8.4 AI Persistence and Observability Tables

- ai_plans
- agent_logs

## 8.5 Analytics and Route Tables

- productivity_metrics
- saved_routes

## 8.6 Important Design Decisions

- UUID primary keys for distributed-safe IDs.
- JSON/JSONB for flexible AI-generated artifacts.
- user_id scoped access patterns for multi-user isolation.
- index usage for frequent filters and joins.

## 8.7 Relationship Summary

- One user owns many projects, plans, sessions, metrics, and routes.
- One project has many tasks.
- One plan has many agent logs.
- One user has one settings row (logical one-to-one).

---

# 9. Security, Authentication, and Privacy

## 9.1 JWT Security Flow

- Access token generated at login/register.
- Token carries user subject and role claims.
- Protected routes resolve current user through dependency injection.

## 9.2 Google OAuth Flow

Two paths:

- New-user login flow.
- Existing-user connect flow.

Tokens are stored in google_tokens and refreshed when possible.

## 9.3 CORS and Environment Isolation

- Local development origins whitelisted.
- Additional origins can be provided through environment variable.

## 9.4 Privacy and Data Handling

- User-scoped querying limits cross-account leakage.
- Sensitive credentials are expected via environment configuration, not hardcoded.

## 9.5 Current Security Risks and Mitigations

Observed engineering risks:

- OAuth tokens in plain DB columns (production should use encrypted at-rest strategy).
- JWT in local storage is XSS-sensitive (HTTP-only cookies can be future option).
- Duplicate utility definitions in google_auth module indicate maintainability risk.

Mitigation roadmap:

- Token encryption and key rotation policy.
- CSP hardening and token transport improvements.
- Utility module refactor and security audit pass.

---

# 10. Testing, Validation, and Evaluation

## 10.1 Testing Strategy

- Unit-like module checks for agents/utilities.
- CLI scenario runs.
- API contract checks via Swagger and script-based requests.
- Frontend integration tests through route-level interaction.

## 10.2 Test Data and Scenarios

Sample scenarios include:

- light day
- busy day
- travel-heavy day

These scenarios support repeatability for behavior validation.

## 10.3 Evaluation Dimensions

- functional correctness
- response structure completeness
- conflict detection relevance
- travel recommendation plausibility
- overall usability

## 10.4 Practical Observations

- Manual mode supports reproducible testing and low setup friction.
- Live mode provides richer output but depends on API availability and latency.
- Multi-agent decomposition improves explainability of intermediate reasoning outputs.

## 10.5 Comparative Methodology with Base Paper

Base paper comparison is conceptual, not task-equivalent:

- Base paper evaluates vulnerability detection metrics (accuracy/F1/CVE coverage).
- This project evaluates planning quality and integration utility.

Transferable methodological elements adopted:

- role specialization
- staged pipeline
- strategy variation by mode
- fallback-aware reliability design

## 10.6 Suggested Quantitative Metrics for Final Viva Demonstration

During final defense, present these measurable metrics from your own system runs:

- average plan generation latency (manual and live)
- average conflict detection count per scenario type
- dashboard refresh time
- chatbot response latency per model source
- fallback occurrence rate
- plan persistence success rate

---

# 11. Deployment and Operations

## 11.1 Backend Deployment Profile

Configuration indicates Render deployment:

- python web service
- uvicorn main:app start command
- environment-based secret injection

## 11.2 Frontend Deployment Profile

Configuration indicates Vercel deployment with SPA rewrite rule to index.html.

## 11.3 Environment Configuration

Backend environment includes:

- database URL
- JWT secret
- API keys for LLM and integrations
- allowed origins

Frontend environment includes:

- backend base URL
- OAuth/public keys as needed

## 11.4 Operational Recommendations

- strict production CORS origin list
- backup and migration policy
- service health endpoint checks
- usage monitoring for API quotas

---

# 12. Results, Discussion, and Limitations

## 12.1 Achieved Outcomes

- Full-stack platform with multi-user auth and persistence.
- Multi-agent planning system with manual and live pipelines.
- Integrated productivity workspace including planner, dashboard, chat, voice, and insights.
- Documented setup and testing process suitable for academic demonstration.

## 12.2 Discussion

Strengths:

- strong modularity and clear separation of concerns
- practical API surface and route coverage
- extensible architecture for new agent roles
- fallback-aware design improves robustness

Trade-offs:

- live mode is sequential and can be latency-heavy
- API dependency introduces operational variability
- heterogeneous response shapes require frontend normalization

## 12.3 Limitations

- some modules rely on fallback heuristics when external services fail
- token security hardening remains future work for production grade
- limited formal benchmark datasets specific to personal planning domain
- no comprehensive automated test suite coverage report yet

## 12.4 Threats to Validity

- environment differences may affect latency and output style
- live data variability can affect reproducibility
- LLM model changes over time can affect behavior consistency

---

# 13. Conclusion and Future Enhancements

## 13.1 Conclusion

This project successfully implements an end-to-end, cooperative multi-agent personal productivity platform. It validates that agent specialization and staged orchestration can improve practical planning support over isolated single-step assistant interactions. The platform is academically relevant and implementation-complete for final year demonstration.

## 13.2 Future Enhancements

1. Parallelize independent live-mode stages to reduce end-to-end latency.
2. Add policy-based autonomous task execution with explicit user approval controls.
3. Implement encrypted token storage and stronger secret management.
4. Add retrieval-augmented memory for long-term personalization.
5. Build full automated test suites with coverage reporting.
6. Introduce proactive notification and reminder engine.
7. Provide mobile-first client and offline-safe features.

---

# 14. References

1. Wei, Z., Sun, J., Sun, Y., et al. Advanced Smart Contract Vulnerability Detection via LLM-Powered Multi-Agent Systems. IEEE Transactions on Software Engineering, 2025.
2. Wooldridge, M. An Introduction to Multi-Agent Systems. Wiley, 2021.
3. Russell, S., Norvig, P. Artificial Intelligence: A Modern Approach. 4th Edition.
4. Brown, T. B., et al. Language Models are Few-Shot Learners. NeurIPS 2020.
5. OpenAI. GPT-4 Technical Report, 2023.
6. LangChain Documentation.
7. LangGraph Documentation.
8. FastAPI Documentation.
9. SQLAlchemy Documentation.
10. React and TypeScript Official Documentation.

---

# 15. Appendices

## Appendix A: Complete Module Inventory

### Backend folders

- agents
- graph
- routers
- database
- middleware
- services
- utils
- config
- prompts
- data

### Frontend folders

- app
- features
- hooks
- services
- store
- components
- utils

## Appendix B: Agent Responsibility Matrix

| Agent | Input | Output | Purpose |
|---|---|---|---|
| CalendarAgent | meetings/events | calendar analysis JSON | schedule structure and density |
| TaskAgent | tasks | task analysis JSON | urgency, priority, workload |
| ConflictAgent | meetings + tasks | conflict list JSON | overlap/deadline pressure |
| TravelAgent | meeting locations | travel plan JSON | route and timing recommendations |
| PlanningAgent | aggregated analyses | optimized schedule JSON | integrated daily plan |
| CoordinatorAgent | all analysis outputs | final natural language summary | user-facing explanation |
| EmailAgent | inbox items | email insight JSON | urgent communication extraction |
| ContactsAgent | contacts + attendees | contact mapping JSON | people context enrichment |
| SheetsAgent | sheet rows | sheet insight JSON | auxiliary numeric/context clues |
| NotesAgent | existing notes + context | notes/reminder JSON | preparation and follow-up support |

## Appendix C: API Endpoint Catalog (Grouped)

### Auth and session

- GET /api/auth/google
- GET /api/auth/google-connect
- GET /api/auth/google/callback
- GET /api/auth/status
- POST /api/auth/logout
- POST /api/db-auth/register
- POST /api/db-auth/login
- GET /api/db-auth/me
- POST /api/db-auth/google-login

### Planner and AI

- POST /api/plan-day
- POST /api/plan-day-live
- GET /api/last-output
- GET /api/ai-plans
- POST /api/ai-plans
- GET /api/ai-plans/{plan_id}
- DELETE /api/ai-plans/{plan_id}
- GET /api/agent-logs
- POST /api/agent-logs
- GET /api/agent-logs/plan/{plan_id}

### Chat and voice

- GET /api/chatbot/context-snapshot
- GET /api/chatbot/available-models
- POST /api/chatbot/ask
- GET /api/chat-history/sessions
- POST /api/chat-history/sessions
- GET /api/chat-history/sessions/{session_id}
- DELETE /api/chat-history/sessions/{session_id}
- DELETE /api/chat-history/sessions
- GET /api/voice/status
- GET /api/voice/settings
- GET /api/voice/voices
- POST /api/voice/tts

### Google service interfaces

- GET /api/calendar/events
- GET /api/calendar/events/range
- POST /api/calendar/events
- GET /api/email/inbox
- GET /api/email/message/{message_id}
- GET /api/email/{message_id}
- POST /api/email/send
- GET /api/contacts/search
- GET /api/tasks/list
- GET /api/tasks/lists
- POST /api/tasks/create
- PUT /api/tasks/complete/{task_id}
- POST /api/tasks/{task_id}/complete
- DELETE /api/tasks/{task_id}
- GET /api/tasks/notes
- POST /api/tasks/notes
- DELETE /api/tasks/notes/{note_id}
- GET /api/sheets/list
- GET /api/sheets/{spreadsheet_id}/tabs
- GET /api/sheets/{spreadsheet_id}
- POST /api/sheets/{spreadsheet_id}
- POST /api/sheets/{spreadsheet_id}/append
- GET /api/maps/directions
- GET /api/maps/distance
- GET /api/maps/geocode
- GET /api/maps/reverse
- GET /api/maps/suggest

### Persistence and analytics

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
- GET /api/settings
- PUT /api/settings
- POST /api/metrics
- GET /api/metrics
- GET /api/metrics/latest
- GET /api/dashboard/summary
- POST /api/meetings/sync
- GET /api/meetings
- GET /api/notes
- POST /api/notes
- PUT /api/notes/{note_id}
- DELETE /api/notes/{note_id}
- GET /api/maps/saved-routes
- POST /api/maps/saved-routes
- DELETE /api/maps/saved-routes/{route_id}

## Appendix D: Database Table Catalog

| Table | Key columns | Description |
|---|---|---|
| users | id, email, password, role | identity and account profile |
| projects | id, user_id, title, status | user-owned project containers |
| tasks | id, project_id, status, priority, due_date | actionable work items |
| chat_sessions | id, user_id, messages | chat history persistence |
| google_tokens | user_id, access_token, refresh_token | OAuth credentials |
| meetings | user_id, start_time, location | synced or local meetings |
| user_settings | user_id, timezone, work_start/end | personalization preferences |
| ai_plans | user_id, plan_date, optimized_schedule | generated planning outputs |
| agent_logs | plan_id, agent_name, status | per-agent execution trace |
| productivity_metrics | user_id, date, score | trend analysis data |
| saved_routes | user_id, origin, destination | reusable map routes |

## Appendix E: Suggested Screenshots to Include for Final Print Report

To comfortably exceed 60 pages, include annotated screenshots (1-2 per subsection):

1. Landing page
2. Login and register
3. Dashboard summary cards
4. Planner input panel
5. Planner execution timeline
6. Planner result tabs
7. Calendar page
8. Tasks page
9. Email page
10. Contacts page
11. Maps page
12. Sheets page
13. Notes page
14. Chatbot with model selector
15. Voice assistant controls
16. Insights charts
17. Settings module
18. Google connect flow
19. Swagger API docs main page
20. Sample AI plan JSON output

## Appendix F: Viva Preparation - Core Questions and Points

1. Why multi-agent instead of one LLM call?
   - specialization, modularity, clearer intermediate outputs, easier debugging.

2. What is unique in your project?
   - full-stack deployment-ready personal planning platform with dual pipeline and real integrations.

3. How is reliability improved?
   - fallback outputs, model fallback chain, global error handlers, cache strategy.

4. How is data secured?
   - JWT route protection, OAuth token flow, scoped DB queries.

5. What are major limitations?
   - live latency, API dependency, incomplete production-grade token hardening.

6. Future scope?
   - parallelized graph execution, adaptive personalization, proactive notifications.

---

## Final Formatting Instructions for Submission Copy

Use these settings while exporting this report to DOC/PDF for department submission:

- Page size: A4
- Font: Times New Roman, 12 pt
- Line spacing: 1.5
- Margins: 1 inch all sides
- Chapter titles: 16 pt bold
- Section titles: 14 pt bold
- Figure caption: 11 pt
- Table caption: 11 pt
- Page numbering: Roman for front matter, Arabic for chapters

With chapter text, tables, architecture diagrams, API tables, and screenshots listed in appendices, this document structure satisfies and typically exceeds the minimum 60-page requirement.
