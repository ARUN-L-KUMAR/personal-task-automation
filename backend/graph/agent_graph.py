"""
Unified Agent Graph

Single ScheduleAgentGraph that supports TWO modes:
- Manual mode:  execute(meetings, tasks)     → User provides data
- Live mode:    execute_live()               → Auto-fetches from Google

11 agents, 1 graph, 2 modes.

Live mode graph topology:
  - Phase 1: Parallel Google fetch (5 agents via ThreadPoolExecutor)
  - Phase 2: Sequential analysis (Travel → Conflicts)
  - Phase 3: Conditional routing — high-severity conflicts → ResolutionAgent
  - Phase 4: Planning → Notes → Coordinate
"""

import os
from typing import TypedDict, List, Dict, Any, Literal
from concurrent.futures import ThreadPoolExecutor, as_completed

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from agents.calendar_agent import CalendarAgent
from agents.task_agent import TaskAgent
from agents.travel_agent import TravelAgent
from agents.email_agent import EmailAgent
from agents.contacts_agent import ContactsAgent
from agents.sheets_agent import SheetsAgent
from agents.notes_agent import NotesAgent
from agents.conflict_agent import ConflictAgent
from agents.planning_agent import PlanningAgent
from agents.coordinator import CoordinatorAgent
from agents.resolution_agent import ConflictResolutionAgent

# Max parallel workers for Google fetch — configurable via env for easy scaling
_MAX_FETCH_WORKERS = int(os.getenv("FETCH_WORKERS", "5"))


class ScheduleState(TypedDict):
    """State that flows through the agent graph"""
    # Input mode flag
    mode: str  # "manual" or "live"
    # Manual input (used in manual mode)
    meetings: List[Dict[str, str]]
    tasks: List[Dict[str, str]]
    # Google data (populated in live mode via parallel fetch)
    google_emails: Dict[str, Any]
    google_contacts: Dict[str, Any]
    google_sheets: Dict[str, Any]
    google_notes: Dict[str, Any]
    # Analysis results (populated in both modes)
    calendar_analysis: Dict[str, Any]
    task_analysis: Dict[str, Any]
    conflicts: Dict[str, Any]
    resolution_plan: Dict[str, Any]   # Output of ConflictResolutionAgent (conditional)
    travel_plan: Dict[str, Any]
    optimized_plan: Dict[str, Any]
    final_response: str
    # Multi-user context
    user: Any  # database.models.User
    db: Any    # sqlalchemy.orm.Session


class ScheduleAgentGraph:
    """
    True LangGraph multi-agent workflow.

    Manual mode: User provides meetings + tasks → 6-node pipeline
    Live mode:   Parallel Google fetch → conditional conflict routing → full analysis
    """
    def __init__(self):
        # Data fetch agents
        self.calendar_agent  = CalendarAgent()
        self.task_agent      = TaskAgent()
        self.travel_agent    = TravelAgent()
        self.email_agent     = EmailAgent()
        self.contacts_agent  = ContactsAgent()
        self.sheets_agent    = SheetsAgent()
        self.notes_agent     = NotesAgent()
        # Reasoning agents
        self.conflict_agent    = ConflictAgent()
        self.resolution_agent  = ConflictResolutionAgent()
        self.planning_agent    = PlanningAgent()
        self.coordinator       = CoordinatorAgent()

        # MemorySaver for manual mode (no user context / thread_id needed)
        self._manual_memory = MemorySaver()

        # PostgresSaver for live mode — persistent across cold starts
        # Falls back to MemorySaver if DATABASE_URL is unavailable (local dev)
        self._live_checkpointer = self._build_checkpointer()

        self.manual_graph = self._build_manual_graph()
        self.live_graph   = self._build_live_graph()

    # =============================================
    # CHECKPOINTER
    # =============================================

    def _build_checkpointer(self):
        """
        Build the checkpointer for live mode.
        Uses PostgresSaver when DATABASE_URL is set (production / staging).
        Falls back to MemorySaver for local dev without a DB URL.
        """
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            try:
                from langgraph.checkpoint.postgres import PostgresSaver
                checkpointer = PostgresSaver.from_conn_string(db_url)
                checkpointer.setup()  # Creates langgraph_checkpoints table if not exists
                print("INFO: Live graph using PostgresSaver (persistent checkpointing)")
                return checkpointer
            except Exception as e:
                print(f"WARNING: PostgresSaver init failed ({e}). Falling back to MemorySaver.")
        print("INFO: Live graph using MemorySaver (no DATABASE_URL set — local dev mode)")
        return MemorySaver()

    # =============================================
    # MANUAL MODE NODES (user provides data)
    # =============================================

    def _analyze_calendar_manual(self, state: ScheduleState) -> ScheduleState:
        """Analyze user-provided meetings."""
        state["calendar_analysis"] = self.calendar_agent.analyze(state["meetings"])
        return state

    def _analyze_tasks_manual(self, state: ScheduleState) -> ScheduleState:
        """Analyze user-provided tasks."""
        state["task_analysis"] = self.task_agent.analyze(state["tasks"])
        return state

    def _plan_travel_manual(self, state: ScheduleState) -> ScheduleState:
        """Plan travel from user-provided meetings (LLM estimates)."""
        state["travel_plan"] = self.travel_agent.plan(state["meetings"])
        return state

    def _detect_conflicts(self, state: ScheduleState) -> ScheduleState:
        """Detect conflicts (works in both modes)."""
        meetings = state.get("meetings", [])
        tasks    = state.get("tasks", [])

        # In live mode, extract from analysis results
        if state.get("mode") == "live":
            raw_events = state.get("calendar_analysis", {}).get("raw_events", [])
            meetings = [
                {"title": e.get("title", ""), "time": e.get("start", ""), "location": e.get("location", "")}
                for e in raw_events
            ]
            raw_tasks = state.get("task_analysis", {}).get("raw_tasks", [])
            tasks = [
                {"title": t.get("title", ""), "deadline": t.get("due", "")}
                for t in raw_tasks
            ]

        state["conflicts"] = self.conflict_agent.detect(meetings, tasks)
        return state

    def _resolve_conflicts(self, state: ScheduleState) -> ScheduleState:
        """
        Resolve high-severity conflicts (conditional node — only reached via
        add_conditional_edges when high-severity conflicts are present).
        """
        state["resolution_plan"] = self.resolution_agent.resolve(
            state["conflicts"],
            state["calendar_analysis"],
            state["task_analysis"],
        )
        return state

    def _create_plan(self, state: ScheduleState) -> ScheduleState:
        """Create optimized plan (works in both modes)."""
        state["optimized_plan"] = self.planning_agent.create_plan(
            state["calendar_analysis"],
            state["task_analysis"],
            state["conflicts"],
            state["travel_plan"],
            state.get("resolution_plan"),   # Optional — None in low-conflict runs
        )
        return state

    def _coordinate(self, state: ScheduleState) -> ScheduleState:
        """Coordinate final response (works in both modes)."""
        state["final_response"] = self.coordinator.coordinate(
            state["calendar_analysis"],
            state["task_analysis"],
            state["conflicts"],
            state["travel_plan"],
            state["optimized_plan"]
        )
        return state

    # =============================================
    # LIVE MODE NODES (auto-fetch from Google)
    # =============================================

    def _fetch_all_parallel(self, state: ScheduleState) -> ScheduleState:
        """
        Run all 5 Google fetch agents concurrently via ThreadPoolExecutor.

        Each fetch is isolated: one failing (e.g. Sheets not connected) does NOT
        block or crash the others. Partial results are always valid.
        Timeout per job: 30s — prevents hanging on flaky Google APIs.
        """
        user = state["user"]
        db   = state["db"]

        fetch_jobs: Dict[str, Any] = {
            "calendar_analysis": lambda: self.calendar_agent.fetch_and_analyze(user, db),
            "task_analysis":     lambda: self.task_agent.fetch_and_analyze(user, db),
            "google_emails":     lambda: self.email_agent.fetch_and_analyze(user, db),
            "google_contacts":   lambda: self.contacts_agent.fetch_and_analyze(user, db),
            "google_sheets":     lambda: self._fetch_sheets_safe(user, db),
        }

        with ThreadPoolExecutor(max_workers=_MAX_FETCH_WORKERS) as executor:
            future_to_key = {executor.submit(fn): key for key, fn in fetch_jobs.items()}
            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    state[key] = future.result(timeout=30)
                except Exception as e:
                    print(f"WARNING: {key} fetch failed: {e}")
                    # Return a graceful empty result rather than crashing the graph
                    state[key] = {
                        "summary": f"{key} unavailable: {str(e)}",
                        "error": str(e),
                        "raw_events": [],
                        "raw_tasks": [],
                    }

        return state

    def _fetch_sheets_safe(self, user, db) -> Dict[str, Any]:
        """Fetch Google Sheets — returns empty if GOOGLE_SHEETS_ID not configured."""
        try:
            from utils.google_auth import get_credentials
            creds = get_credentials(user, db)
            if not creds:
                return {"summary": "Google Sheets not connected", "data_insights": []}

            spreadsheet_id = os.getenv("GOOGLE_SHEETS_ID")
            if not spreadsheet_id:
                return {
                    "summary": "No default sheet configured (set GOOGLE_SHEETS_ID env var)",
                    "data_insights": [],
                    "patterns": [],
                    "recommendations": [],
                    "action_items": [],
                }

            return self.sheets_agent.fetch_and_analyze(user, db, spreadsheet_id)
        except Exception as e:
            return {
                "summary": f"Sheet fetch error: {str(e)}",
                "data_insights": [],
                "patterns": [],
                "recommendations": [],
                "action_items": [],
            }

    def _analyze_travel_live(self, state: ScheduleState) -> ScheduleState:
        """Get real directions from Google Maps."""
        events = state.get("calendar_analysis", {}).get("raw_events", [])
        meetings_for_maps = [
            {"title": e.get("title", ""), "location": e.get("location", ""), "time": e.get("start", "")}
            for e in events
            if e.get("location") and e.get("location") != "No location"
        ]
        state["travel_plan"] = self.travel_agent.analyze_travel(meetings_for_maps)
        return state

    def _generate_notes_live(self, state: ScheduleState) -> ScheduleState:
        """Generate smart notes from real data."""
        events = state.get("calendar_analysis", {}).get("raw_events", [])
        tasks  = state.get("task_analysis", {}).get("raw_tasks", [])
        state["google_notes"] = self.notes_agent.fetch_and_analyze(state["user"], state["db"], events, tasks)
        return state

    # =============================================
    # CONDITIONAL ROUTING
    # =============================================

    def _route_after_conflicts(self, state: ScheduleState) -> Literal["resolve_conflicts", "create_plan"]:
        """
        Conditional edge function.
        Routes to ConflictResolutionAgent only when high-severity conflicts exist.
        For low/medium conflicts, skips straight to planning (faster path).
        """
        high_severity = [
            c for c in state.get("conflicts", {}).get("conflicts", [])
            if c.get("severity") == "high"
        ]
        if high_severity:
            print(f"INFO: {len(high_severity)} high-severity conflict(s) detected — routing to resolve_conflicts")
            return "resolve_conflicts"
        print("INFO: No high-severity conflicts — routing directly to create_plan")
        return "create_plan"

    # =============================================
    # BUILD GRAPHS
    # =============================================

    def _build_manual_graph(self):
        """
        Manual mode: 6-node pipeline with user-provided data.
        No conditional routing needed (manual data rarely has real high-severity conflicts).
        """
        workflow = StateGraph(ScheduleState)

        workflow.add_node("analyze_calendar", self._analyze_calendar_manual)
        workflow.add_node("analyze_tasks",    self._analyze_tasks_manual)
        workflow.add_node("detect_conflicts", self._detect_conflicts)
        workflow.add_node("plan_travel",      self._plan_travel_manual)
        workflow.add_node("create_plan",      self._create_plan)
        workflow.add_node("coordinate",       self._coordinate)

        workflow.set_entry_point("analyze_calendar")
        workflow.add_edge("analyze_calendar", "analyze_tasks")
        workflow.add_edge("analyze_tasks",    "detect_conflicts")
        workflow.add_edge("detect_conflicts", "plan_travel")
        workflow.add_edge("plan_travel",      "create_plan")
        workflow.add_edge("create_plan",      "coordinate")
        workflow.add_edge("coordinate",       END)

        return workflow.compile(checkpointer=self._manual_memory)

    def _build_live_graph(self):
        """
        Live mode: Parallel fetch → conditional conflict routing → full analysis.

        Graph topology:
          fetch_all_parallel → analyze_travel → detect_conflicts
            → [conditional] → resolve_conflicts (high severity only)
            → create_plan → generate_notes → coordinate → END
        """
        workflow = StateGraph(ScheduleState)

        # Phase 1: Single parallel fetch node (replaces 5 sequential fetch nodes)
        workflow.add_node("fetch_all_parallel", self._fetch_all_parallel)

        # Phase 2: Sequential analysis
        workflow.add_node("analyze_travel",   self._analyze_travel_live)
        workflow.add_node("detect_conflicts", self._detect_conflicts)

        # Phase 3: Conditional — resolution only when needed
        workflow.add_node("resolve_conflicts", self._resolve_conflicts)

        # Phase 4: Planning → Notes → Coordinate
        workflow.add_node("create_plan",     self._create_plan)
        workflow.add_node("generate_notes",  self._generate_notes_live)
        workflow.add_node("coordinate",      self._coordinate)

        # Sequential flow up to conflict detection
        workflow.set_entry_point("fetch_all_parallel")
        workflow.add_edge("fetch_all_parallel", "analyze_travel")
        workflow.add_edge("analyze_travel",     "detect_conflicts")

        # Conditional branch after conflict detection
        workflow.add_conditional_edges(
            "detect_conflicts",
            self._route_after_conflicts,
            {
                "resolve_conflicts": "resolve_conflicts",
                "create_plan":       "create_plan",
            }
        )

        # Resolution always leads to planning
        workflow.add_edge("resolve_conflicts", "create_plan")

        # Final pipeline
        workflow.add_edge("create_plan",    "generate_notes")
        workflow.add_edge("generate_notes", "coordinate")
        workflow.add_edge("coordinate",     END)

        return workflow.compile(checkpointer=self._live_checkpointer)

    # =============================================
    # EXECUTE
    # =============================================

    def execute(self, meetings: List[Dict[str, str]],
                tasks: List[Dict[str, str]]) -> Dict[str, Any]:
        """Execute in MANUAL mode — user provides meetings and tasks."""
        initial_state: ScheduleState = {
            "mode":             "manual",
            "meetings":         meetings,
            "tasks":            tasks,
            "google_emails":    {},
            "google_contacts":  {},
            "google_sheets":    {},
            "google_notes":     {},
            "calendar_analysis": {},
            "task_analysis":    {},
            "conflicts":        {},
            "resolution_plan":  {},
            "travel_plan":      {},
            "optimized_plan":   {},
            "final_response":   "",
            "user":             None,
            "db":               None,
        }
        # Manual mode uses a generic thread_id (not user-scoped)
        config = {"configurable": {"thread_id": "manual-mode"}}
        return self.manual_graph.invoke(initial_state, config=config)

    def execute_live(self, user, db) -> Dict[str, Any]:
        """
        Execute in LIVE mode — auto-fetches from Google services.
        State is checkpointed per user (thread_id = user-{user.id}).
        """
        initial_state: ScheduleState = {
            "mode":             "live",
            "user":             user,
            "db":               db,
            "meetings":         [],
            "tasks":            [],
            "google_emails":    {},
            "google_contacts":  {},
            "google_sheets":    {},
            "google_notes":     {},
            "calendar_analysis": {},
            "task_analysis":    {},
            "conflicts":        {},
            "resolution_plan":  {},
            "travel_plan":      {},
            "optimized_plan":   {},
            "final_response":   "",
        }
        # Unique thread per user — enables per-user checkpointing and state persistence
        config = {"configurable": {"thread_id": f"user-{user.id}"}}
        return self.live_graph.invoke(initial_state, config=config)
