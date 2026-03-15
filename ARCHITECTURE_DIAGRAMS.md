# System Architecture Diagrams

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INPUT                            │
│   (Meetings: [{title, time, location}], Tasks: [...])       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend Layer                      │
│                  POST /plan-day endpoint                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 LangGraph Agent Workflow                     │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  State: ScheduleState (TypedDict)                │      │
│  │  - meetings, tasks, calendar_analysis,           │      │
│  │    task_analysis, conflicts, travel_plan,        │      │
│  │    optimized_plan, final_response                │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │   START     │───→│  Calendar   │                        │
│  └─────────────┘    │   Agent     │                        │
│                     └──────┬──────┘                        │
│                            ↓                                 │
│                     ┌─────────────┐                        │
│                     │    Task     │                        │
│                     │   Agent     │                        │
│                     └──────┬──────┘                        │
│                            ↓                                 │
│                     ┌─────────────┐                        │
│                     │  Conflict   │                        │
│                     │   Agent     │                        │
│                     └──────┬──────┘                        │
│                            ↓                                 │
│                     ┌─────────────┐                        │
│                     │   Travel    │                        │
│                     │   Agent     │                        │
│                     └──────┬──────┘                        │
│                            ↓                                 │
│                     ┌─────────────┐                        │
│                     │  Planning   │                        │
│                     │   Agent     │                        │
│                     └──────┬──────┘                        │
│                            ↓                                 │
│                     ┌─────────────┐                        │
│                     │ Coordinator │                        │
│                     │   Agent     │                        │
│                     └──────┬──────┘                        │
│                            ↓                                 │
│                     ┌─────────────┐                        │
│                     │     END     │                        │
│                     └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      JSON Response                           │
│  {status, calendar_analysis, task_analysis, conflicts,       │
│   travel_plan, optimized_plan, final_response, metadata}    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│              Display AI-powered recommendations              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Agent Interaction Flow

```
┌──────────────────┐
│  User Schedule   │
│  Data Input      │
└────────┬─────────┘
         │
         ↓
    [LangGraph Initializes State]
         │
         ↓
┌────────────────────────────────────────┐
│  CalendarAgent (AI)                    │
│  ────────────────────────────          │
│  Prompt: "Analyze these meetings..."   │
│  LLM: DeepSeek-R1                      │
│  Output: {summary, busy_periods,       │
│           locations, insights}         │
└────────┬───────────────────────────────┘
         │ [State Updated]
         ↓
┌────────────────────────────────────────┐
│  TaskAgent (AI)                        │
│  ────────────────────────────          │
│  Prompt: "Analyze these tasks..."      │
│  LLM: DeepSeek-R1                      │
│  Output: {urgent_tasks, priority,      │
│           workload, recommendations}   │
└────────┬───────────────────────────────┘
         │ [State Updated]
         ↓
┌────────────────────────────────────────┐
│  ConflictAgent (AI)                    │
│  ────────────────────────────          │
│  Prompt: "Detect conflicts between..." │
│  LLM: DeepSeek-R1                      │
│  Output: {has_conflicts, conflicts,    │
│           severity, descriptions}      │
└────────┬───────────────────────────────┘
         │ [State Updated]
         ↓
┌────────────────────────────────────────┐
│  TravelAgent (AI)                      │
│  ────────────────────────────          │
│  Prompt: "Plan travel for meetings..." │
│  LLM: DeepSeek-R1                      │
│  Output: {travel_plan, departure_times,│
│           duration, notes}             │
└────────┬───────────────────────────────┘
         │ [State Updated]
         ↓
┌────────────────────────────────────────┐
│  PlanningAgent (AI)                    │
│  ────────────────────────────          │
│  Prompt: "Create optimized schedule    │
│           based on all analysis..."    │
│  LLM: DeepSeek-R1                      │
│  Output: {optimized_schedule,          │
│           conflict_resolutions, tips}  │
└────────┬───────────────────────────────┘
         │ [State Updated]
         ↓
┌────────────────────────────────────────┐
│  CoordinatorAgent (AI)                 │
│  ────────────────────────────          │
│  Prompt: "Synthesize all outputs into  │
│           friendly summary..."         │
│  LLM: DeepSeek-R1                      │
│  Output: "Your day looks busy! You     │
│           have 3 meetings and..."      │
└────────┬───────────────────────────────┘
         │ [Final State]
         ↓
    ┌────────┐
    │  END   │
    └────────┘
         │
         ↓
   [Return Complete State to API]
```

---

## 3. State Evolution Through Graph

```
Initial State:
┌─────────────────────────────────────┐
│ meetings: [{...}]                   │
│ tasks: [{...}]                      │
│ calendar_analysis: {}               │
│ task_analysis: {}                   │
│ conflicts: {}                       │
│ travel_plan: {}                     │
│ optimized_plan: {}                  │
│ final_response: ""                  │
└─────────────────────────────────────┘
         │
         ↓ [CalendarAgent]
┌─────────────────────────────────────┐
│ meetings: [{...}]                   │
│ tasks: [{...}]                      │
│ calendar_analysis: {summary: "...", │
│   busy_periods: [...], ...}         │
│ task_analysis: {}                   │
│ conflicts: {}                       │
│ travel_plan: {}                     │
│ optimized_plan: {}                  │
│ final_response: ""                  │
└─────────────────────────────────────┘
         │
         ↓ [TaskAgent]
┌─────────────────────────────────────┐
│ meetings: [{...}]                   │
│ tasks: [{...}]                      │
│ calendar_analysis: {...}            │
│ task_analysis: {urgent_tasks: [...],│
│   priority_order: [...], ...}       │
│ conflicts: {}                       │
│ travel_plan: {}                     │
│ optimized_plan: {}                  │
│ final_response: ""                  │
└─────────────────────────────────────┘
         │
         ↓ [ConflictAgent]
┌─────────────────────────────────────┐
│ meetings: [{...}]                   │
│ tasks: [{...}]                      │
│ calendar_analysis: {...}            │
│ task_analysis: {...}                │
│ conflicts: {has_conflicts: true,    │
│   conflicts: [...], ...}            │
│ travel_plan: {}                     │
│ optimized_plan: {}                  │
│ final_response: ""                  │
└─────────────────────────────────────┘
         │
         ↓ [TravelAgent]
┌─────────────────────────────────────┐
│ meetings: [{...}]                   │
│ tasks: [{...}]                      │
│ calendar_analysis: {...}            │
│ task_analysis: {...}                │
│ conflicts: {...}                    │
│ travel_plan: {travel_plan: [...],   │
│   total_travel_time: "..."}         │
│ optimized_plan: {}                  │
│ final_response: ""                  │
└─────────────────────────────────────┘
         │
         ↓ [PlanningAgent]
┌─────────────────────────────────────┐
│ meetings: [{...}]                   │
│ tasks: [{...}]                      │
│ calendar_analysis: {...}            │
│ task_analysis: {...}                │
│ conflicts: {...}                    │
│ travel_plan: {...}                  │
│ optimized_plan: {optimized_schedule:│
│   [...], conflict_resolutions: [...]}│
│ final_response: ""                  │
└─────────────────────────────────────┘
         │
         ↓ [CoordinatorAgent]
┌─────────────────────────────────────┐
│ meetings: [{...}]                   │
│ tasks: [{...}]                      │
│ calendar_analysis: {...}            │
│ task_analysis: {...}                │
│ conflicts: {...}                    │
│ travel_plan: {...}                  │
│ optimized_plan: {...}               │
│ final_response: "Your day looks..." │
└─────────────────────────────────────┘
         │
         ↓
   [Complete State Returned]
```

---

## 4. Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Backend Package                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   config/   │  │   agents/   │  │   graph/    │    │
│  │             │  │             │  │             │    │
│  │ settings.py │  │ 6 AI agents │  │agent_graph  │    │
│  │   (LLM)     │  │   classes   │  │  .py        │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │             │
│         └────────────────┴────────────────┘             │
│                          ↓                               │
│                   ┌─────────────┐                       │
│                   │   main.py   │                       │
│                   │  (FastAPI)  │                       │
│                   └─────────────┘                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack Layers

```
┌──────────────────────────────────────┐
│        Frontend Layer                 │
│  React.js (User Interface)            │
└────────────┬─────────────────────────┘
             ↓ HTTP/REST
┌──────────────────────────────────────┐
│        API Layer                      │
│  FastAPI (Python Web Framework)      │
└────────────┬─────────────────────────┘
             ↓
┌──────────────────────────────────────┐
│     Orchestration Layer               │
│  LangGraph (Agent Workflow)           │
└────────────┬─────────────────────────┘
             ↓
┌──────────────────────────────────────┐
│        Agent Layer                    │
│  LangChain (Agent Framework)          │
│  - CalendarAgent                      │
│  - TaskAgent                          │
│  - ConflictAgent                      │
│  - TravelAgent                        │
│  - PlanningAgent                      │
│  - CoordinatorAgent                   │
└────────────┬─────────────────────────┘
             ↓
┌──────────────────────────────────────┐
│         LLM Layer                     │
│  OpenRouter API                       │
│  DeepSeek-R1 Model (Free Tier)       │
└──────────────────────────────────────┘
```

---

## 6. Data Flow Sequence

```
┌────┐     ┌────────┐     ┌──────────┐     ┌─────┐     ┌────────┐
│User│     │FastAPI │     │LangGraph │     │Agent│     │LLM API │
└─┬──┘     └───┬────┘     └────┬─────┘     └──┬──┘     └───┬────┘
  │            │                │               │            │
  │ POST /plan-day             │               │            │
  ├───────────→│                │               │            │
  │            │  Initialize    │               │            │
  │            │  Graph State   │               │            │
  │            ├───────────────→│               │            │
  │            │                │ Execute Node  │            │
  │            │                ├──────────────→│            │
  │            │                │               │ Prompt     │
  │            │                │               ├───────────→│
  │            │                │               │            │
  │            │                │               │ Response   │
  │            │                │               │←───────────┤
  │            │                │ Update State  │            │
  │            │                │←──────────────┤            │
  │            │                │               │            │
  │            │                │ [Repeat for each agent]    │
  │            │                │               │            │
  │            │  Final State   │               │            │
  │            │←───────────────┤               │            │
  │            │                │               │            │
  │ JSON Response              │               │            │
  │←───────────┤                │               │            │
  │            │                │               │            │
```

---

## 7. Comparison: Before vs After

### BEFORE (Rule-Based)
```
User Input
    ↓
FastAPI
    ↓
calendar_agent() ─┐
task_agent() ─────┤
conflict_agent() ─┤→ Simple
travel_agent() ───┤  String
planning_agent() ─┤  Operations
    ↓             │
llm_explanation()←┘
    ↓
Simple Response
```

### AFTER (AI Multi-Agent)
```
User Input
    ↓
FastAPI
    ↓
LangGraph State Machine
    ↓
CalendarAgent (AI) ──┐
TaskAgent (AI) ──────┤
ConflictAgent (AI) ──┤→ Rich
TravelAgent (AI) ────┤  JSON
PlanningAgent (AI) ──┤  Analysis
CoordinatorAgent (AI)┘
    ↓
Comprehensive AI Response
```

---

These diagrams illustrate the complete transformation of the Personal_Task 
system into a true multi-agent architecture powered by LangChain and LangGraph!
