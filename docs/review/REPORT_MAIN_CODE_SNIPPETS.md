# G-ONE Report: Main Code Snippets (Frontend, Backend, DB, AI)

This file contains only the main implementation snippets for report usage.
Use these in your PDF under implementation/appendix sections.

---

## 1) Frontend Main Code

### 1.1 App Bootstrap + Google OAuth
Source: frontend/src/index.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Router } from './app/router';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID!}>
            <Router />
        </GoogleOAuthProvider>
    </React.StrictMode>
);
```

### 1.2 Routing Architecture (Public + Protected)
Source: frontend/src/app/router.tsx

```tsx
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { AuthGuard } from './layout/AuthGuard';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { LandingPage } from '../features/landing/LandingPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PlannerPage } from '../features/planner/PlannerPage';

const Protected = ({ children }: { children: React.ReactNode }) => (
    <AuthGuard>
        <AppLayout>{children}</AppLayout>
    </AuthGuard>
);

const router = createBrowserRouter([
    { path: '/', element: <LandingPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },

    { path: '/dashboard', element: <Protected><DashboardPage /></Protected> },
    { path: '/planner', element: <Protected><PlannerPage /></Protected> },
    { path: '/contacts', element: <Protected><Navigate to="/all?tab=contacts" replace /></Protected> },
]);

export function Router() {
    return <RouterProvider router={router} />;
}
```

### 1.3 API Client + JWT Interceptor
Source: frontend/src/services/api.ts

```ts
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('g-one_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
```

### 1.4 Planner API Calls (Manual + Live)
Source: frontend/src/features/planner/planner.service.ts

```ts
export const plannerService = {
    planDay: async (settings, meetings, tasks) => {
        const payload = {
            date: settings.date,
            meetings: meetings.map((m) => ({
                title: m.title,
                startTime: m.startTime,
                endTime: m.endTime,
                location: m.location,
                isFlexible: m.isFlexible,
                priority: m.priority,
            })),
            tasks: tasks.map((t) => ({
                title: t.title,
                duration: t.estimatedDuration,
                deadline: t.deadline,
                requiresTravel: t.requiresTravel,
                flexibleDeadline: t.flexibleDeadline,
                category: t.category,
                priority: t.priority,
            })),
        };

        const res = await api.post('/api/plan-day', payload);
        return normalise(res.data);
    },

    planDayLive: async () => {
        const res = await api.post('/api/plan-day-live');
        return normalise(res.data);
    },
};
```

---

## 2) Backend Main Code

### 2.1 FastAPI App + Router Registration
Source: backend/main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError

app = FastAPI(title="AI Personal Task Automation System - Multi-Agent")

app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, db_connection_error_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(planner_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(db_auth_router, prefix="/api")
app.include_router(ai_plans_router, prefix="/api")
app.include_router(agent_logs_router, prefix="/api")
```

### 2.2 Planner Endpoints (Manual + Live)
Source: backend/routers/planner_router.py

```python
@router.post("/plan-day-live")
def plan_day_live(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_authenticated(current_user, db):
        raise HTTPException(
            status_code=401,
            detail="Google not connected. Please connect Google account in Settings."
        )

    graph = ScheduleAgentGraph()
    result = graph.execute_live(current_user, db)

    return {
        "status": "success",
        "calendar_analysis": result.get("calendar_analysis", {}),
        "task_analysis": result.get("task_analysis", {}),
        "google_emails": result.get("google_emails", {}),
        "google_contacts": result.get("google_contacts", {}),
        "conflicts": result.get("conflicts", {}),
        "travel_plan": result.get("travel_plan", {}),
        "optimized_plan": result.get("optimized_plan", {}),
        "final_response": result.get("final_response", "")
    }

@router.post("/plan-day")
def plan_day_manual(
    data: PlannerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    graph = ScheduleAgentGraph()
    result = graph.execute(meetings_list, tasks_list)

    return {
        "status": "success",
        "conflict_analysis": result.get("conflicts"),
        "travel_reminders": result.get("travel_plan"),
        "ai_explanation": result.get("final_response"),
        "rule_based_plan": result.get("optimized_plan")
    }
```

---

## 3) Database Main Code

### 3.1 Database Connection + Session Dependency
Source: backend/database/connection.py

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 3.2 Core ORM Models (User, AIPlan, AgentLog)
Source: backend/database/models.py

```python
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role", create_constraint=True), default=UserRole.USER, nullable=False)

class AIPlan(Base):
    __tablename__ = "ai_plans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_date = Column(Date, nullable=False)
    optimized_schedule = Column(JSONB, nullable=True)
    conflicts = Column(JSONB, nullable=True)
    travel_plan = Column(JSONB, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    model_used = Column(String(100), nullable=True)

class AgentLog(Base):
    __tablename__ = "agent_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("ai_plans.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    execution_time_ms = Column(Integer, nullable=True)
    output = Column(JSONB, nullable=True)
```

---

## 4) AI Main Code

### 4.1 Unified Multi-Agent Graph (Manual + Live)
Source: backend/graph/agent_graph.py

```python
class ScheduleAgentGraph:
    def __init__(self):
        self.calendar_agent = CalendarAgent()
        self.task_agent = TaskAgent()
        self.travel_agent = TravelAgent()
        self.email_agent = EmailAgent()
        self.contacts_agent = ContactsAgent()
        self.sheets_agent = SheetsAgent()
        self.notes_agent = NotesAgent()
        self.conflict_agent = ConflictAgent()
        self.planning_agent = PlanningAgent()
        self.coordinator = CoordinatorAgent()

        self.manual_graph = self._build_manual_graph()
        self.live_graph = self._build_live_graph()

    def _build_manual_graph(self):
        workflow = StateGraph(ScheduleState)
        workflow.add_node("analyze_calendar", self._analyze_calendar_manual)
        workflow.add_node("analyze_tasks", self._analyze_tasks_manual)
        workflow.add_node("detect_conflicts", self._detect_conflicts)
        workflow.add_node("plan_travel", self._plan_travel_manual)
        workflow.add_node("create_plan", self._create_plan)
        workflow.add_node("coordinate", self._coordinate)
        workflow.set_entry_point("analyze_calendar")
        workflow.add_edge("analyze_calendar", "analyze_tasks")
        workflow.add_edge("analyze_tasks", "detect_conflicts")
        workflow.add_edge("detect_conflicts", "plan_travel")
        workflow.add_edge("plan_travel", "create_plan")
        workflow.add_edge("create_plan", "coordinate")
        workflow.add_edge("coordinate", END)
        return workflow.compile()

    def execute(self, meetings, tasks):
        initial_state = {"mode": "manual", "meetings": meetings, "tasks": tasks}
        return self.manual_graph.invoke(initial_state)

    def execute_live(self, user, db):
        initial_state = {"mode": "live", "user": user, "db": db, "meetings": [], "tasks": []}
        return self.live_graph.invoke(initial_state)
```

### 4.2 Planning Agent Prompt + Structured JSON Output
Source: backend/agents/planning_agent.py

```python
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from config.settings import llm

class PlanningAgent:
    def __init__(self):
        self.parser = JsonOutputParser()

        with open("prompts/planning_agent_prompt.txt", "r") as f:
            prompt_content = f.read()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", f"""{prompt_content}

CRITICAL: Return ONLY a valid JSON object."""),
            ("human", """Create an optimized daily plan based on this information:

Calendar Analysis: {calendar_analysis}
Task Analysis: {task_analysis}
Conflicts Detected: {conflicts}
Travel Planning: {travel_plan}

Return ONLY JSON:""")
        ])

    def create_plan(self, calendar_analysis, task_analysis, conflicts, travel_plan):
        chain = self.prompt | llm | self.parser
        return chain.invoke({
            "calendar_analysis": json.dumps(calendar_analysis, indent=2),
            "task_analysis": json.dumps(task_analysis, indent=2),
            "conflicts": json.dumps(conflicts, indent=2),
            "travel_plan": json.dumps(travel_plan, indent=2)
        })
```

---

## 5) Recommended Report Placement

- Chapter: System Implementation
  - Frontend snippets 1.1 to 1.4
  - Backend snippets 2.1 to 2.2
  - Database snippets 3.1 to 3.2
  - AI snippets 4.1 to 4.2

- Appendix: Full Technical Snippets
  - Paste all sections exactly as above.

---

## 6) Additional Frontend Snippets (Extended)

### 6.1 Auth API Service
Source: frontend/src/services/auth.service.ts

```ts
import api from './api';

const TOKEN_KEY = 'g-one_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/login', payload);
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/register', payload);
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const getMe = async (): Promise<UserProfile> => {
    const response = await api.get('/api/db-auth/me');
    return response.data;
};
```

### 6.2 Auth State Store (Zustand)
Source: frontend/src/store/useAuthStore.ts

```ts
export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: !!getToken(),
    isLoading: false,
    error: null,

    login: async (payload) => {
        set({ isLoading: true, error: null });
        try {
            const data = await loginUser(payload);
            set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
            set({ isLoading: false, error: err.message || 'Login failed' });
            throw err;
        }
    },

    checkAuth: async () => {
        const token = getToken();
        if (!token) {
            set({ isAuthenticated: false, user: null, isLoading: false });
            return;
        }
        try {
            const user = await getMe();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
```

### 6.3 Planner Store Pipeline State
Source: frontend/src/store/usePlannerStore.ts

```ts
const AGENT_PIPELINE: { key: string; label: string }[] = [
    { key: 'calendar', label: 'Calendar Agent' },
    { key: 'tasks', label: 'Task Agent' },
    { key: 'email', label: 'Email Agent' },
    { key: 'conflict', label: 'Conflict Agent' },
    { key: 'travel', label: 'Travel Agent' },
    { key: 'planning', label: 'Planning Agent' },
    { key: 'explanation', label: 'Explanation Agent' },
];

const buildInitialSteps = (): AgentStep[] =>
    AGENT_PIPELINE.map((a) => ({ key: a.key, label: a.label, status: 'idle' as const }));

export const usePlannerStore = create<PlannerState>((set) => ({
    executionPhase: 'idle',
    agentSteps: buildInitialSteps(),
    currentResult: null,
    error: null,

    startExecution: () =>
        set({
            executionPhase: 'running',
            agentSteps: buildInitialSteps(),
            currentResult: null,
            error: null,
        }),

    completeExecution: (result) =>
        set({ executionPhase: 'completed', currentResult: result }),

    failExecution: (error) => set({ executionPhase: 'error', error }),
}));
```

### 6.4 Planner Page Run Trigger
Source: frontend/src/features/planner/PlannerPage.tsx

```tsx
const handleGenerate = useCallback(async () => {
    if (executing.current) return;
    executing.current = true;
    store.startExecution();

    try {
        const [result] = await Promise.all([
            store.mode === 'manual'
                ? plannerService.planDay(store.settings, store.meetings, store.tasks)
                : plannerService.planDayLive(),
            animateSteps(),
        ]);
        store.completeExecution(result);
    } catch (err: any) {
        store.failExecution(err.message || 'Pipeline failed');
    } finally {
        executing.current = false;
    }
}, [store.mode, store.settings, store.meetings, store.tasks, animateSteps]);
```

---

## 7) Additional Backend Snippets (Extended)

### 7.1 JWT User Dependency Middleware
Source: backend/middleware/__init__.py

```python
bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    user = db.query(User).options(joinedload(User.google_tokens)).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
```

### 7.2 Register/Login Router
Source: backend/routers/db_auth_router.py

```python
@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(name=payload.name, email=payload.email, password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return AuthResponse(user=UserResponse.model_validate(user), access_token=token)

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return AuthResponse(user=UserResponse.model_validate(user), access_token=token)
```

### 7.3 Chatbot Parallel Google Fetch (Performance Pattern)
Source: backend/routers/chatbot_router.py

```python
def _get_raw_data(user: User, db: Session) -> dict:
    results = {
        "calendar": [], "tasks": [], "gmail": [],
        "contacts": False, "sheets": [], "timestamp": _time.time()
    }

    with ThreadPoolExecutor(max_workers=5) as ex:
        f_cal = ex.submit(fetch_cal)
        f_tsk = ex.submit(fetch_tasks)
        f_gml = ex.submit(fetch_gmail)
        f_con = ex.submit(fetch_con)
        f_sht = ex.submit(fetch_sheets)

        for f in as_completed([f_cal, f_tsk, f_gml, f_con, f_sht], timeout=15):
            pass

        results["calendar"] = f_cal.result() if f_cal.done() else []
        results["tasks"] = f_tsk.result() if f_tsk.done() else []
        results["gmail"] = f_gml.result() if f_gml.done() else []
        results["contacts"] = f_con.result() if f_con.done() else False
        results["sheets"] = f_sht.result() if f_sht.done() else []

    return results
```

---

## 8) Additional Database Snippets (Extended)

### 8.1 User Relationships and Connected Tables
Source: backend/database/models.py

```python
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role", create_constraint=True), default=UserRole.USER, nullable=False)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")
    chat_sessions = relationship("ChatSession", back_populates="owner", cascade="all, delete-orphan")
    google_tokens = relationship("GoogleToken", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    ai_plans = relationship("AIPlan", back_populates="user", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")
    productivity_metrics = relationship("ProductivityMetric", back_populates="user", cascade="all, delete-orphan")
```

### 8.2 Pydantic Request/Response Schemas
Source: backend/database/schemas.py

```python
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    status: TaskStatusEnum = TaskStatusEnum.TODO
    project_id: UUID
    due_date: Optional[date] = None

class AIPlanResponse(BaseModel):
    id: UUID
    user_id: UUID
    plan_date: date
    optimized_schedule: Optional[Any]
    conflicts: Optional[Any]
    travel_plan: Optional[Any]
    execution_time_ms: Optional[int]
    model_used: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
```

---

## 9) Dedicated API Snippets (Routes and Contracts)

### 9.1 Calendar API (Google Integration)
Source: backend/routers/calendar_router.py

```python
@router.get("/events")
def fetch_today_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")

    events = get_today_events(current_user, db)
    return {"status": "success", "events": events, "count": len(events)}

@router.post("/events")
def create_calendar_event(
    event: CreateEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")

    result = create_event(
        current_user, db,
        summary=event.summary,
        start_time=event.start_time,
        end_time=event.end_time,
        location=event.location,
        description=event.description
    )
    return {"status": "success", "event": result}
```

### 9.2 Tasks and Notes API
Source: backend/routers/tasks_router.py

```python
@router.get("/list")
def fetch_tasks(
    list_id: str = Query("@default", description="Task list ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks = get_tasks(current_user, db, list_id=list_id)
    return {"status": "success", "tasks": tasks, "count": len(tasks)}

@router.post("/create")
@router.post("")
def create_new_task(
    title: str = Query(..., description="Task title"),
    notes: str = Query("", description="Task notes"),
    due: str = Query("", description="Task due date"),
    list_id: str = Query("@default", description="Task list ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = create_task(current_user, db, title=title, notes=notes, due=due, list_id=list_id)
    return {"status": "success", "task": result}

@router.post("/notes")
def create_new_note(
    note: CreateNoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = create_note(current_user, db, title=note.title, content=note.content)
    return {"status": "success", "note": result}
```

### 9.3 Projects CRUD API (Database Layer)
Source: backend/routers/projects_router.py

```python
@router.get("", response_model=List[ProjectResponse])
def list_projects(
    status_filter: Optional[ProjectStatusEnum] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Project).filter(Project.user_id == current_user.id)
    if status_filter:
        query = query.filter(Project.status == status_filter.value)
    return query.order_by(Project.created_at.desc()).all()

@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = Project(
        title=payload.title,
        description=payload.description,
        status=payload.status.value,
        user_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project
```

### 9.4 Frontend API Consumption Pattern
Source: frontend/src/services/auth.service.ts

```ts
export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/login', payload);
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/register', payload);
    const data: AuthResponse = response.data;
    setToken(data.access_token);
    return data;
};

export const checkGoogleDetailedServicesStatus = async (): Promise<GoogleServicesStatus> => {
    const response = await api.get('/api/auth/services-status');
    return response.data;
};
```

---

## 10) Suggested Paste Order for PDF

1. Frontend core: 1.1, 1.2, 1.3, 6.2, 6.4
2. Backend core: 2.1, 2.2, 7.1, 7.2
3. Database core: 3.1, 3.2, 8.1, 8.2
4. API chapter: 9.1, 9.2, 9.3, 9.4
5. AI chapter: 4.1, 4.2, 7.3
