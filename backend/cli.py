"""
CLI Interface for Personal Task Automation Multi-Agent System

This script provides a command-line interface to test the multi-agent
schedule analysis system powered by LangChain and LangGraph.
"""

import json
import sys
from dotenv import load_dotenv
from graph.agent_graph import ScheduleAgentGraph
from data.data_loader import DataLoader, list_all_scenarios

# Load environment variables
load_dotenv()


def print_separator(char="=", length=60):
    """Print a separator line"""
    print(char * length)


def print_header(text):
    """Print a formatted header"""
    print_separator()
    print(f"  {text}")
    print_separator()


def get_meetings():
    """Get meeting details from user input"""
    meetings = []
    print("\n📅 Enter meeting details (leave title empty to stop):")
    
    while True:
        print(f"\nMeeting #{len(meetings) + 1}:")
        title = input("  Title: ").strip()
        if not title:
            break
        
        time = input("  Time (e.g., 10:00 AM): ").strip()
        location = input("  Location: ").strip()
        
        meetings.append({
            "title": title,
            "time": time,
            "location": location
        })
        
        print("  ✅ Meeting added!")
    
    return meetings


def get_tasks():
    """Get task details from user input"""
    tasks = []
    print("\n📝 Enter task details (leave title empty to stop):")
    
    while True:
        print(f"\nTask #{len(tasks) + 1}:")
        title = input("  Title: ").strip()
        if not title:
            break
        
        deadline = input("  Deadline (e.g., 5:00 PM): ").strip()
        
        tasks.append({
            "title": title,
            "deadline": deadline
        })
        
        print("  ✅ Task added!")
    
    return tasks


def display_results(result):
    """Display the analysis results in a formatted way"""
    print("\n")
    print_separator("=")
    print("  📊 SCHEDULE ANALYSIS RESULTS")
    print_separator("=")
    
    # Calendar Analysis
    print("\n📅 CALENDAR ANALYSIS:")
    print_separator("-")
    cal_analysis = result.get('calendar_analysis', {})
    print(f"Summary: {cal_analysis.get('summary', 'N/A')}")
    print(f"Total Meetings: {cal_analysis.get('total_meetings', 0)}")
    if cal_analysis.get('busy_periods'):
        print(f"Busy Periods: {', '.join(cal_analysis['busy_periods'])}")
    if cal_analysis.get('locations'):
        print(f"Locations: {', '.join(cal_analysis['locations'])}")
    
    # Task Analysis
    print("\n📝 TASK ANALYSIS:")
    print_separator("-")
    task_analysis = result.get('task_analysis', {})
    print(f"Summary: {task_analysis.get('summary', 'N/A')}")
    print(f"Total Tasks: {task_analysis.get('total_tasks', 0)}")
    print(f"Workload: {task_analysis.get('workload_assessment', 'N/A').upper()}")
    if task_analysis.get('urgent_tasks'):
        print(f"Urgent Tasks: {', '.join(task_analysis['urgent_tasks'])}")
    
    # Conflicts
    print("\n⚠️  CONFLICT DETECTION:")
    print_separator("-")
    conflicts = result.get('conflicts', {})
    has_conflicts = conflicts.get('has_conflicts', False)
    print(f"Conflicts Found: {'YES' if has_conflicts else 'NO'}")
    if has_conflicts:
        print(f"Conflict Count: {conflicts.get('conflict_count', 0)}")
        for conflict in conflicts.get('conflicts', []):
            print(f"\n  • Type: {conflict.get('type', 'N/A')}")
            print(f"    Severity: {conflict.get('severity', 'N/A').upper()}")
            print(f"    Description: {conflict.get('description', 'N/A')}")
    
    # Travel Plan
    print("\n🚗 TRAVEL PLANNING:")
    print_separator("-")
    travel = result.get('travel_plan', {})
    print(f"Summary: {travel.get('summary', 'N/A')}")
    if travel.get('total_travel_time'):
        print(f"Total Travel Time: {travel['total_travel_time']}")
    
    # Optimized Plan
    print("\n📋 OPTIMIZED SCHEDULE:")
    print_separator("-")
    opt_plan = result.get('optimized_plan', {})
    if opt_plan.get('focus_areas'):
        print("Focus Areas:")
        for area in opt_plan['focus_areas']:
            print(f"  • {area}")
    
    # Final Response
    print("\n💡 AI ASSISTANT SUMMARY:")
    print_separator("-")
    final_response = result.get('final_response', 'No response available')
    print(final_response)
    
    print("\n")
    print_separator("=")


def use_sample_scenario():
    """Let user choose from sample scenarios"""
    loader = DataLoader()
    scenarios = list_all_scenarios()
    
    print("\n📦 Available Sample Scenarios:")
    print_separator("-")
    for i, scenario in enumerate(scenarios, 1):
        print(f"{i}. {scenario['id']}")
        print(f"   Description: {scenario['description']}")
        print(f"   Meetings: {scenario['meeting_count']}, Tasks: {scenario['task_count']}")
        print()
    
    try:
        choice = int(input("Select scenario number (0 to cancel): "))
        if choice == 0:
            return None, None
        if 1 <= choice <= len(scenarios):
            scenario_id = scenarios[choice - 1]['id']
            data = loader.get_scenario(scenario_id)
            print(f"\n✅ Loaded scenario: {scenario_id}")
            return data['meetings'], data['tasks']
    except (ValueError, IndexError):
        print("❌ Invalid selection")
    
    return None, None


def main():
    """Main CLI application"""
    print_header("🤖 AI Personal Task Automation (Multi-Agent CLI)")
    
    print("\n🎯 This system uses 6 AI agents to analyze your schedule:")
    print("   1. CalendarAgent - Meeting analysis")
    print("   2. TaskAgent - Task prioritization")
    print("   3. ConflictAgent - Conflict detection")
    print("   4. TravelAgent - Travel planning")
    print("   5. PlanningAgent - Schedule optimization")
    print("   6. CoordinatorAgent - Final recommendations")
    
    print("\n📋 Choose input method:")
    print("   1. Enter schedule manually")
    print("   2. Use sample scenario")
    print("   3. Exit")
    
    choice = input("\nYour choice (1-3): ").strip()
    
    if choice == "3":
        print("\n👋 Goodbye!")
        sys.exit(0)
    
    # Get schedule data
    meetings = []
    tasks = []
    
    if choice == "1":
        # Manual input
        meetings = get_meetings()
        tasks = get_tasks()
    elif choice == "2":
        # Sample scenario
        meetings, tasks = use_sample_scenario()
        if meetings is None:
            print("\n❌ No scenario loaded. Exiting.")
            sys.exit(0)
    else:
        print("\n❌ Invalid choice. Exiting.")
        sys.exit(1)
    
    # Validate input
    if not meetings and not tasks:
        print("\n⚠️  No meetings or tasks entered. Nothing to analyze!")
        sys.exit(0)
    
    print(f"\n✅ Schedule loaded: {len(meetings)} meeting(s), {len(tasks)} task(s)")
    
    # Initialize and run the multi-agent system
    print("\n🤖 Initializing AI Multi-Agent System...")
    print("   This may take a moment as agents analyze your schedule...\n")
    
    try:
        agent_graph = ScheduleAgentGraph()
        
        print("🔄 Running agent workflow...")
        result = agent_graph.execute(meetings, tasks)
        
        # Display results
        display_results(result)
        
        # Option to save results
        save_choice = input("\n💾 Save results to file? (y/n): ").strip().lower()
        if save_choice == 'y':
            filename = f"schedule_analysis_{len(meetings)}m_{len(tasks)}t.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"✅ Results saved to: {filename}")
        
        print("\n✨ Analysis complete!")
        
    except Exception as e:
        print(f"\n❌ Error during analysis: {str(e)}")
        print("\nMake sure:")
        print("  1. OPENROUTER_API_KEY is set in .env file")
        print("  2. All dependencies are installed (pip install -r requirements.txt)")
        print("  3. You have internet connection for API calls")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user. Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)
