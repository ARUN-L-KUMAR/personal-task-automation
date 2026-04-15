# G-ONE Single Merged Code Snippets (Frontend + Backend + DB + API)

Use this as one combined source for your PDF report.
All snippets are grouped in a single file and ordered for direct paste.

---

## 1) Frontend (Merged)

### 1.1 App Entry + OAuth + Router
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

### 1.2 Route Architecture (Public + Protected)
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
import { ChatbotPage } from '../features/chatbot/ChatbotPage';
import { SettingsPage } from '../features/settings/SettingsPage';

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
    { path: '/chatbot', element: <Protected><ChatbotPage /></Protected> },
    { path: '/settings', element: <Protected><SettingsPage /></Protected> },
    { path: '/contacts', element: <Protected><Navigate to="/all?tab=contacts" replace /></Protected> },
    { path: '/notes', element: <Protected><Navigate to="/all?tab=notes" replace /></Protected> },
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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('g-one_token');
        }
        return Promise.reject(error);
    }
);

export default api;
```

### 1.4 Auth Service + Auth Store + Planner API Trigger
Sources:
- frontend/src/services/auth.service.ts
- frontend/src/store/useAuthStore.ts
- frontend/src/features/planner/planner.service.ts

```ts
// auth.service.ts
export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/login', payload);
    const data: AuthResponse = response.data;
    localStorage.setItem('g-one_token', data.access_token);
    return data;
};

export const registerUser = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post('/api/db-auth/register', payload);
    const data: AuthResponse = response.data;
    localStorage.setItem('g-one_token', data.access_token);
    return data;
};

export const getMe = async (): Promise<UserProfile> => {
    const response = await api.get('/api/db-auth/me');
    return response.data;
};

// useAuthStore.ts
export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: !!getToken(),
    isLoading: false,
    error: null,

    login: async (payload) => {
        set({ isLoading: true, error: null });
        const data = await loginUser(payload);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
    },

    checkAuth: async () => {
        const token = getToken();
        if (!token) return set({ isAuthenticated: false, user: null, isLoading: false });
        try {
            const user = await getMe();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));

// planner.service.ts
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

## 2) Backend (Merged)

### 2.1 FastAPI Bootstrap + Middleware + Router Registration
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
app.include_router(calendar_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(planner_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(db_auth_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(db_tasks_router, prefix="/api")
app.include_router(ai_plans_router, prefix="/api")
app.include_router(agent_logs_router, prefix="/api")
```

### 2.2 JWT Current User Dependency
Source: backend/middleware/__init__.py

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload

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

    user_id = payload.get("sub")
    user = db.query(User).options(joinedload(User.google_tokens)).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
```

### 2.3 Planner Router (Manual + Live)
Source: backend/routers/planner_router.py

```python
@router.post("/plan-day-live")
def plan_day_live(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_authenticated(current_user, db):
        raise HTTPException(status_code=401, detail="Google not connected. Please connect Google account in Settings.")

    graph = ScheduleAgentGraph()
    result = graph.execute_live(current_user, db)

    plan = AIPlan(
        user_id=current_user.id,
        plan_date=date_type.today(),
        optimized_schedule=result.get("optimized_plan"),
        conflicts=result.get("conflicts"),
        travel_plan=result.get("travel_plan"),
        model_used="llama-3.3-70b-versatile",
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return {
        "status": "success",
        "plan_id": str(plan.id),
        "calendar_analysis": result.get("calendar_analysis", {}),
        "task_analysis": result.get("task_analysis", {}),
        "google_emails": result.get("google_emails", {}),
        "google_contacts": result.get("google_contacts", {}),
        "conflicts": result.get("conflicts", {}),
        "travel_plan": result.get("travel_plan", {}),
        "optimized_plan": result.get("optimized_plan", {}),
        "final_response": result.get("final_response", ""),
    }

@router.post("/plan-day")
def plan_day_manual(data: PlannerRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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

### 2.4 Register/Login API Logic
Source: backend/routers/db_auth_router.py

```python
@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
    )
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

---

## 3) Database (Merged)

### 3.1 Connection and Session Management
Source: backend/database/connection.py

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

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

### 3.2 Core ORM Models
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
    google_tokens = relationship("GoogleToken", back_populates="user", cascade="all, delete-orphan")
    ai_plans = relationship("AIPlan", back_populates="user", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    priority = Column(Enum(TaskPriority, name="task_priority", create_constraint=True), default=TaskPriority.MEDIUM, nullable=False)
    status = Column(Enum(TaskStatus, name="task_status", create_constraint=True), default=TaskStatus.TODO, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

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

### 3.3 Request/Response Schemas
Source: backend/database/schemas.py

```python
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    status: TaskStatusEnum = TaskStatusEnum.TODO
    project_id: UUID
    due_date: Optional[date] = None

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
```

---

## 4) API (Merged)

### 4.1 Calendar API
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

@router.get("/events/range")
def fetch_events_range(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    max_results: int = Query(20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = get_events(current_user, db, start_date=start, end_date=end, max_results=max_results)
    return {"status": "success", "events": events, "count": len(events)}
```

### 4.2 Tasks + Notes API
Source: backend/routers/tasks_router.py

```python
@router.get("/list")
def fetch_tasks(
    list_id: str = Query("@default"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks = get_tasks(current_user, db, list_id=list_id)
    return {"status": "success", "tasks": tasks, "count": len(tasks)}

@router.post("/create")
@router.post("")
def create_new_task(
    title: str = Query(...),
    notes: str = Query(""),
    due: str = Query(""),
    list_id: str = Query("@default"),
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

### 4.3 Projects CRUD API
Source: backend/routers/projects_router.py

```python
@router.get("", response_model=List[ProjectResponse])
def list_projects(
    status_filter: Optional[ProjectStatusEnum] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Project).filter(Project.user_id == current_user.id)
    if status_filter:
        query = query.filter(Project.status == status_filter.value)
    return query.order_by(Project.created_at.desc()).offset(offset).limit(limit).all()

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

### 4.4 Frontend Consumption of API Contracts
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

## 5) Quick PDF Paste Plan

1. Frontend chapter: 1.1, 1.2, 1.3, 1.4
2. Backend chapter: 2.1, 2.2, 2.3, 2.4
3. Database chapter: 3.1, 3.2, 3.3
4. API chapter: 4.1, 4.2, 4.3, 4.4
