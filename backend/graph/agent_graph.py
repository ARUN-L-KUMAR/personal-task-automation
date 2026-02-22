"""
Unified Agent Graph

Single ScheduleAgentGraph that supports TWO modes:
- Manual mode:  execute(meetings, tasks)     → User provides data
- Live mode:    execute_live()               → Auto-fetches from Google

10 agents, 1 graph, 2 modes.
"""

from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
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


class ScheduleState(TypedDict):
    """State that flows through the agent graph"""
    # Input mode flag
    mode: str  # "manual" or "live"
    # Manual input (used in manual mode)
    meetings: List[Dict[str, str]]
    tasks: List[Dict[str, str]]
    # Google data (populated in live mode)
    google_emails: Dict[str, Any]
    google_contacts: Dict[str, Any]
    google_sheets: Dict[str, Any]
    google_notes: Dict[str, Any]
    # Analysis results (populated in both modes)
    calendar_analysis: Dict[str, Any]
    task_analysis: Dict[str, Any]
    conflicts: Dict[str, Any]
    travel_plan: Dict[str, Any]
    optimized_plan: Dict[str, Any]
    final_response: str


class ScheduleAgentGraph:
    """
    Unified LangGraph multi-agent workflow.

    Manual mode: User provides meetings + tasks → all 6 core agents run
    Live mode:   Auto-fetches from Google → all 10 agents run
    """
    def __init__(self):
        # Core agents (dual-mode)
        self.calendar_agent = CalendarAgent()
        self.task_agent = TaskAgent()
        self.travel_agent = TravelAgent()
        self.email_agent = EmailAgent()
        self.contacts_agent = ContactsAgent()
        self.sheets_agent = SheetsAgent()
        self.notes_agent = NotesAgent()
        # Analysis agents
        self.conflict_agent = ConflictAgent()
        self.planning_agent = PlanningAgent()
        self.coordinator = CoordinatorAgent()

        self.manual_graph = self._build_manual_graph()
        self.live_graph = self._build_live_graph()

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
        tasks = state.get("tasks", [])

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

    def _create_plan(self, state: ScheduleState) -> ScheduleState:
        """Create optimized plan (works in both modes)."""
        state["optimized_plan"] = self.planning_agent.create_plan(
            state["calendar_analysis"],
            state["task_analysis"],
            state["conflicts"],
            state["travel_plan"]
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

    def _fetch_calendar_live(self, state: ScheduleState) -> ScheduleState:
        """Auto-fetch from Google Calendar."""
        state["calendar_analysis"] = self.calendar_agent.fetch_and_analyze()
        return state

    def _fetch_tasks_live(self, state: ScheduleState) -> ScheduleState:
        """Auto-fetch from Google Tasks."""
        state["task_analysis"] = self.task_agent.fetch_and_analyze()
        return state

    def _fetch_emails_live(self, state: ScheduleState) -> ScheduleState:
        """Auto-fetch from Gmail."""
        state["google_emails"] = self.email_agent.fetch_and_analyze()
        return state

    def _fetch_contacts_live(self, state: ScheduleState) -> ScheduleState:
        """Auto-fetch contacts and match with meeting attendees."""
        events = state.get("calendar_analysis", {}).get("raw_events", [])
        state["google_contacts"] = self.contacts_agent.fetch_and_analyze(events)
        return state

    def _fetch_sheets_live(self, state: ScheduleState) -> ScheduleState:
        """Sheets placeholder (optional, needs spreadsheet ID config)."""
        state["google_sheets"] = {"summary": "No spreadsheet configured", "data_insights": []}
        return state

    def _analyze_travel_live(self, state: ScheduleState) -> ScheduleState:
        """Get real directions from Google Maps."""
        events = state.get("calendar_analysis", {}).get("raw_events", [])
        meetings_for_maps = [
            {"title": e.get("title", ""), "location": e.get("location", ""), "time": e.get("start", "")}
            for e in events if e.get("location") and e.get("location") != "No location"
        ]
        state["travel_plan"] = self.travel_agent.analyze_travel(meetings_for_maps)
        return state

    def _generate_notes_live(self, state: ScheduleState) -> ScheduleState:
        """Generate smart notes from real data."""
        events = state.get("calendar_analysis", {}).get("raw_events", [])
        tasks = state.get("task_analysis", {}).get("raw_tasks", [])
        state["google_notes"] = self.notes_agent.fetch_and_analyze(events, tasks)
        return state

    # =============================================
    # BUILD GRAPHS
    # =============================================

    def _build_manual_graph(self):
        """Manual mode: 6-node pipeline with user-provided data."""
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

    def _build_live_graph(self):
        """Live mode: 10-node pipeline with Google auto-fetch."""
        workflow = StateGraph(ScheduleState)

        # Phase 1: Google Data Fetch (4 agents)
        workflow.add_node("fetch_calendar", self._fetch_calendar_live)
        workflow.add_node("fetch_tasks", self._fetch_tasks_live)
        workflow.add_node("fetch_emails", self._fetch_emails_live)
        workflow.add_node("fetch_contacts", self._fetch_contacts_live)
        workflow.add_node("fetch_sheets", self._fetch_sheets_live)

        # Phase 2: Analysis (5 agents)
        workflow.add_node("analyze_travel", self._analyze_travel_live)
        workflow.add_node("detect_conflicts", self._detect_conflicts)
        workflow.add_node("create_plan", self._create_plan)
        workflow.add_node("generate_notes", self._generate_notes_live)
        workflow.add_node("coordinate", self._coordinate)

        # Sequential flow
        workflow.set_entry_point("fetch_calendar")
        workflow.add_edge("fetch_calendar", "fetch_tasks")
        workflow.add_edge("fetch_tasks", "fetch_emails")
        workflow.add_edge("fetch_emails", "fetch_contacts")
        workflow.add_edge("fetch_contacts", "fetch_sheets")
        workflow.add_edge("fetch_sheets", "analyze_travel")
        workflow.add_edge("analyze_travel", "detect_conflicts")
        workflow.add_edge("detect_conflicts", "create_plan")
        workflow.add_edge("create_plan", "generate_notes")
        workflow.add_edge("generate_notes", "coordinate")
        workflow.add_edge("coordinate", END)

        return workflow.compile()

    # =============================================
    # EXECUTE
    # =============================================

    def execute(self, meetings: List[Dict[str, str]],
                tasks: List[Dict[str, str]]) -> Dict[str, Any]:
        """Execute in MANUAL mode — user provides meetings and tasks."""
        initial_state: ScheduleState = {
            "mode": "manual",
            "meetings": meetings,
            "tasks": tasks,
            "google_emails": {},
            "google_contacts": {},
            "google_sheets": {},
            "google_notes": {},
            "calendar_analysis": {},
            "task_analysis": {},
            "conflicts": {},
            "travel_plan": {},
            "optimized_plan": {},
            "final_response": ""
        }
        return self.manual_graph.invoke(initial_state)

    def execute_live(self) -> Dict[str, Any]:
        """Execute in LIVE mode — auto-fetches from Google services."""
        initial_state: ScheduleState = {
            "mode": "live",
            "meetings": [],
            "tasks": [],
            "google_emails": {},
            "google_contacts": {},
            "google_sheets": {},
            "google_notes": {},
            "calendar_analysis": {},
            "task_analysis": {},
            "conflicts": {},
            "travel_plan": {},
            "optimized_plan": {},
            "final_response": ""
        }
        return self.live_graph.invoke(initial_state)
