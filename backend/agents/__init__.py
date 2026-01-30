"""
Multi-Agent System for Personal Task Automation

This module contains AI-powered agents for schedule management:
- CalendarAgent: Analyzes meeting schedules
- TaskAgent: Analyzes task priorities and urgency
- ConflictAgent: Detects scheduling conflicts
- TravelAgent: Plans travel logistics
- PlanningAgent: Creates optimized schedules
- CoordinatorAgent: Synthesizes agent outputs
"""

from .calendar_agent import CalendarAgent
from .task_agent import TaskAgent
from .conflict_agent import ConflictAgent
from .travel_agent import TravelAgent
from .planning_agent import PlanningAgent
from .coordinator import CoordinatorAgent

__all__ = [
    'CalendarAgent',
    'TaskAgent',
    'ConflictAgent',
    'TravelAgent',
    'PlanningAgent',
    'CoordinatorAgent'
]
