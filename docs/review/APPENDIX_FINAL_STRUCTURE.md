# FINAL STRUCTURE OF APPENDIX

This file follows the exact order requested for report submission.

---

## 📄 APPENDIX A – Frontend Snippets

### Planner UI
Source: frontend/src/features/planner/PlannerPage.tsx

```tsx
const AGENT_KEYS = ['calendar', 'tasks', 'email', 'conflict', 'travel', 'planning', 'explanation'];

const animateSteps = useCallback(async () => {
    for (let i = 0; i < AGENT_KEYS.length; i++) {
        const key = AGENT_KEYS[i];
        store.setAgentStepStatus(key, 'running');
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
        store.setAgentStepStatus(key, 'success', `${key} analysis complete`);
        if (i === 4) store.setExecutionPhase('optimizing');
    }
}, []);

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

<button
    onClick={handleGenerate}
    disabled={isRunning || !canGenerate}
>
    {isRunning ? 'Generating...' : 'Generate Plan'}
</button>
```

---

## 📄 APPENDIX B – Backend Core Logic

### Multi-agent workflow
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

### Planner execution
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
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return {
        "status": "success",
        "plan_id": str(plan.id),
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

---

## 📄 APPENDIX C – Algorithms

### Task planning
Source: backend/agents/task_agent.py

```python
class TaskAgent:
    def analyze(self, tasks):
        if not tasks:
            return self._empty_result()

        chain = self.prompt | llm | self.parser
        try:
            result = chain.invoke({"tasks": json.dumps(tasks, indent=2)})
            result["raw_tasks"] = tasks
            result.setdefault("total_tasks", len(tasks))
            return result
        except Exception as e:
            return {
                "summary": f"Task analysis for {len(tasks)} tasks",
                "total_tasks": len(tasks),
                "urgent_tasks": [t.get("title", "") for t in tasks],
                "priority_order": [t.get("title", "") for t in tasks],
                "workload_assessment": "moderate",
                "recommendations": [f"Error: {str(e)}"],
                "raw_tasks": tasks
            }

    def fetch_and_analyze(self, user, db):
        task_lists = get_task_lists(user, db)
        all_tasks = []
        for tl in task_lists:
            tasks = get_tasks(user, db, list_id=tl["id"])
            for task in tasks:
                task["list_name"] = tl["title"]
            all_tasks.extend(tasks)
        return self.analyze(all_tasks)
```

### Conflict detection
Source: backend/agents/conflict_agent.py

```python
class ConflictAgent:
    def detect(self, meetings, tasks):
        chain = self.prompt | llm | self.parser

        try:
            return chain.invoke({
                "meetings": json.dumps(meetings, indent=2),
                "tasks": json.dumps(tasks, indent=2)
            })
        except Exception as e:
            conflicts = []
            if meetings and tasks:
                conflicts.append({
                    "type": "potential_overlap",
                    "severity": "medium",
                    "description": "Basic analysis suggests potential scheduling conflicts",
                    "items_involved": ["Multiple meetings and tasks detected"]
                })

            return {
                "has_conflicts": len(conflicts) > 0,
                "conflicts": conflicts,
                "conflict_count": len(conflicts),
                "summary": f"Basic conflict analysis completed. Found {len(conflicts)} potential issues. Error details: {str(e)}"
            }
```

---

## 📄 APPENDIX D – API Endpoints

### Planner API
Source: backend/routers/planner_router.py

```python
class PlannerRequest(BaseModel):
    date: str
    meetings: List[Meeting]
    tasks: List[Task]

@router.post("/plan-day-live")
def plan_day_live(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ...

@router.post("/plan-day")
def plan_day_manual(data: PlannerRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ...

@router.get("/last-output")
def get_last_output(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ...
```

### Auth API
Source: backend/routers/db_auth_router.py

```python
@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    ...

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    ...

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    ...

@router.post("/google-login", response_model=AuthResponse)
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    ...
```

---

## 📄 APPENDIX E – AI Integration

### LLM call
Sources:
- backend/config/settings.py
- backend/agents/planning_agent.py

```python
# settings.py
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.4,
    max_tokens=1000,
    request_timeout=40,
)

# planning_agent.py
class PlanningAgent:
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

## 📄 APPENDIX F – Database Schema

### Task model
Source: backend/database/models.py

```python
class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(Enum(TaskPriority, name="task_priority", create_constraint=True), default=TaskPriority.MEDIUM, nullable=False)
    status = Column(Enum(TaskStatus, name="task_status", create_constraint=True), default=TaskStatus.TODO, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(Date, nullable=True)
    estimated_duration = Column(Integer, nullable=True)
    category = Column(String(100), nullable=True)
    source = Column(String(50), nullable=True)
```

### User model
Source: backend/database/models.py

```python
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role", create_constraint=True), default=UserRole.USER, nullable=False)
    is_google_user = Column(Boolean, default=False, nullable=True)
    google_id = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")
    google_tokens = relationship("GoogleToken", back_populates="user", cascade="all, delete-orphan")
    ai_plans = relationship("AIPlan", back_populates="user", cascade="all, delete-orphan")
```
