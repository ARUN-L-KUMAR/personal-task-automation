from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from agents.calendar_agent import CalendarAgent
from agents.task_agent import TaskAgent
from agents.conflict_agent import ConflictAgent
from agents.travel_agent import TravelAgent
from agents.planning_agent import PlanningAgent
from agents.coordinator import CoordinatorAgent


class ScheduleState(TypedDict):
    """State that flows through the agent graph"""
    meetings: List[Dict[str, str]]
    tasks: List[Dict[str, str]]
    calendar_analysis: Dict[str, Any]
    task_analysis: Dict[str, Any]
    conflicts: Dict[str, Any]
    travel_plan: Dict[str, Any]
    optimized_plan: Dict[str, Any]
    final_response: str


class ScheduleAgentGraph:
    """
    LangGraph-based multi-agent workflow for schedule management
    """
    def __init__(self):
        self.calendar_agent = CalendarAgent()
        self.task_agent = TaskAgent()
        self.conflict_agent = ConflictAgent()
        self.travel_agent = TravelAgent()
        self.planning_agent = PlanningAgent()
        self.coordinator = CoordinatorAgent()
        
        self.graph = self._build_graph()
    
    def _analyze_calendar(self, state: ScheduleState) -> ScheduleState:
        """Node: Analyze calendar meetings"""
        calendar_analysis = self.calendar_agent.analyze(state["meetings"])
        state["calendar_analysis"] = calendar_analysis
        return state
    
    def _analyze_tasks(self, state: ScheduleState) -> ScheduleState:
        """Node: Analyze tasks"""
        task_analysis = self.task_agent.analyze(state["tasks"])
        state["task_analysis"] = task_analysis
        return state
    
    def _detect_conflicts(self, state: ScheduleState) -> ScheduleState:
        """Node: Detect conflicts between meetings and tasks"""
        conflicts = self.conflict_agent.detect(
            state["meetings"], 
            state["tasks"]
        )
        state["conflicts"] = conflicts
        return state
    
    def _plan_travel(self, state: ScheduleState) -> ScheduleState:
        """Node: Plan travel for meetings"""
        travel_plan = self.travel_agent.plan(state["meetings"])
        state["travel_plan"] = travel_plan
        return state
    
    def _create_optimized_plan(self, state: ScheduleState) -> ScheduleState:
        """Node: Create optimized daily plan"""
        optimized_plan = self.planning_agent.create_plan(
            state["calendar_analysis"],
            state["task_analysis"],
            state["conflicts"],
            state["travel_plan"]
        )
        state["optimized_plan"] = optimized_plan
        return state
    
    def _coordinate_response(self, state: ScheduleState) -> ScheduleState:
        """Node: Coordinate final response"""
        final_response = self.coordinator.coordinate(
            state["calendar_analysis"],
            state["task_analysis"],
            state["conflicts"],
            state["travel_plan"],
            state["optimized_plan"]
        )
        state["final_response"] = final_response
        return state
    
    def _build_graph(self):
        """Build the agent workflow graph"""
        workflow = StateGraph(ScheduleState)
        
        # Add nodes
        workflow.add_node("analyze_calendar", self._analyze_calendar)
        workflow.add_node("analyze_tasks", self._analyze_tasks)
        workflow.add_node("detect_conflicts", self._detect_conflicts)
        workflow.add_node("plan_travel", self._plan_travel)
        workflow.add_node("create_plan", self._create_optimized_plan)
        workflow.add_node("coordinate", self._coordinate_response)
        
        # Define edges (workflow sequence)
        workflow.set_entry_point("analyze_calendar")
        workflow.add_edge("analyze_calendar", "analyze_tasks")
        workflow.add_edge("analyze_tasks", "detect_conflicts")
        workflow.add_edge("detect_conflicts", "plan_travel")
        workflow.add_edge("plan_travel", "create_plan")
        workflow.add_edge("create_plan", "coordinate")
        workflow.add_edge("coordinate", END)
        
        return workflow.compile()
    
    def execute(self, meetings: List[Dict[str, str]], 
                tasks: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Execute the agent graph with given meetings and tasks
        
        Args:
            meetings: List of meeting dictionaries
            tasks: List of task dictionaries
        
        Returns:
            Complete analysis with all agent outputs
        """
        initial_state: ScheduleState = {
            "meetings": meetings,
            "tasks": tasks,
            "calendar_analysis": {},
            "task_analysis": {},
            "conflicts": {},
            "travel_plan": {},
            "optimized_plan": {},
            "final_response": ""
        }
        
        # Run the graph
        result = self.graph.invoke(initial_state)
        
        return result
