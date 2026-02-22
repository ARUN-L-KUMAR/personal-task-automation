"""
CLI Interface for Personal Task Automation Multi-Agent System

Supports:
- Manual input mode (user provides meetings + tasks)
- Sample scenario mode (pre-built test data)
- Google Live mode (auto-fetches from connected Google services)
- Google Connect/Disconnect
"""

import json
import sys
import webbrowser
from dotenv import load_dotenv
from graph.agent_graph import ScheduleAgentGraph
from data.data_loader import DataLoader, list_all_scenarios
from utils.google_auth import is_authenticated, get_auth_url, logout

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


def display_results(result, mode="manual"):
    """Display the analysis results in a formatted way"""
    print("\n")
    print_separator("=")
    print(f"  📊 SCHEDULE ANALYSIS RESULTS ({mode.upper()} MODE)")
    print_separator("=")
    
    # Calendar Analysis
    print("\n📅 CALENDAR ANALYSIS:")
    print_separator("-")
    cal_analysis = result.get('calendar_analysis', {})
    print(f"Summary: {cal_analysis.get('summary', 'N/A')}")
    total = cal_analysis.get('total_events', cal_analysis.get('total_meetings', 0))
    print(f"Total Events: {total}")
    if cal_analysis.get('busy_periods'):
        print(f"Busy Periods: {', '.join(str(b) for b in cal_analysis['busy_periods'])}")
    if cal_analysis.get('free_slots'):
        print(f"Free Slots: {', '.join(str(s) for s in cal_analysis['free_slots'])}")
    if cal_analysis.get('locations'):
        print(f"Locations: {', '.join(str(l) for l in cal_analysis['locations'])}")
    
    # Task Analysis
    print("\n📝 TASK ANALYSIS:")
    print_separator("-")
    task_analysis = result.get('task_analysis', {})
    print(f"Summary: {task_analysis.get('summary', 'N/A')}")
    print(f"Total Tasks: {task_analysis.get('total_tasks', 0)}")
    workload = task_analysis.get('workload_assessment', 'N/A')
    print(f"Workload: {workload.upper() if isinstance(workload, str) else workload}")
    if task_analysis.get('urgent_tasks'):
        print(f"Urgent Tasks: {', '.join(str(t) for t in task_analysis['urgent_tasks'])}")
    
    # Google Emails (Live mode only)
    if mode == "live":
        emails = result.get('google_emails', {})
        if emails and emails.get('total_emails', 0) > 0:
            print("\n📧 EMAIL ANALYSIS:")
            print_separator("-")
            print(f"Summary: {emails.get('summary', 'N/A')}")
            print(f"Total: {emails.get('total_emails', 0)}, Unread: {emails.get('unread_count', 0)}")
            if emails.get('action_items'):
                print("Action Items:")
                for item in emails['action_items'][:5]:
                    print(f"  • {item}")
        
        # Google Contacts
        contacts = result.get('google_contacts', {})
        if contacts and contacts.get('meeting_contacts'):
            print("\n👥 CONTACTS MATCHED:")
            print_separator("-")
            print(f"Summary: {contacts.get('summary', 'N/A')}")
    
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
    if opt_plan.get('optimized_schedule'):
        for item in opt_plan['optimized_schedule']:
            emoji = {"meeting": "📅", "task": "📝", "break": "☕", "travel": "🚗"}.get(item.get('type', ''), "📌")
            print(f"  {emoji} {item.get('time_block', '')} — {item.get('activity', '')}")
    if opt_plan.get('focus_areas'):
        print("\nFocus Areas:")
        for area in opt_plan['focus_areas']:
            print(f"  • {area}")
    
    # Google Notes (Live mode only)
    if mode == "live":
        notes = result.get('google_notes', {})
        if notes and notes.get('key_notes'):
            print("\n🗒️  SMART NOTES:")
            print_separator("-")
            for note in notes['key_notes'][:5]:
                print(f"  • {note}")
    
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


def google_connect():
    """Connect or check Google account status"""
    if is_authenticated():
        print("\n✅ Google account is already connected!")
        print("   All Google services are active.")
        disc = input("\n   Disconnect? (y/n): ").strip().lower()
        if disc == 'y':
            logout()
            print("   ✅ Disconnected from Google.")
    else:
        print("\n🔗 Google account is NOT connected.")
        print("   To connect, the backend server must be running on port 8000.")
        connect = input("\n   Open Google login in browser? (y/n): ").strip().lower()
        if connect == 'y':
            auth_url = get_auth_url()
            if auth_url:
                print(f"\n   Opening browser...")
                webbrowser.open(auth_url)
                print("   After signing in, come back here and press Enter.")
                input("\n   Press Enter after completing Google login... ")
                if is_authenticated():
                    print("   ✅ Google connected successfully!")
                else:
                    print("   ❌ Connection not detected. Make sure you completed the login.")
            else:
                print("   ❌ credentials.json not found! Place it in the backend folder.")


def run_live_mode():
    """Run analysis using real Google data"""
    if not is_authenticated():
        print("\n❌ Google account not connected!")
        print("   Use option 4 to connect first.")
        return
    
    print("\n🌐 Fetching REAL data from Google services...")
    print("   Calendar, Tasks, Gmail, Contacts, Maps, Sheets, Notes")
    print("   This may take a moment...\n")
    
    try:
        agent_graph = ScheduleAgentGraph()
        print("🔄 Running 10-agent live pipeline...")
        result = agent_graph.execute_live()
        display_results(result, mode="live")
        
        save_choice = input("\n💾 Save results to file? (y/n): ").strip().lower()
        if save_choice == 'y':
            filename = "live_analysis_result.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False, default=str)
            print(f"✅ Results saved to: {filename}")
        
        print("\n✨ Live analysis complete!")
        
    except Exception as e:
        print(f"\n❌ Error during live analysis: {str(e)}")


def main():
    """Main CLI application"""
    print_header("🤖 AI Personal Task Automation (Multi-Agent CLI)")
    
    # Show Google status
    google_status = "✅ Connected" if is_authenticated() else "❌ Not Connected"
    
    print(f"\n🎯 This system uses 10 AI agents to analyze your schedule:")
    print(f"   ┌─ Data Agents (dual-mode: manual + Google) ───────┐")
    print(f"   │  1. CalendarAgent  — Meeting analysis             │")
    print(f"   │  2. TaskAgent      — Task prioritization          │")
    print(f"   │  3. TravelAgent    — Travel planning (Maps)       │")
    print(f"   │  4. EmailAgent     — Email analysis (Gmail)       │")
    print(f"   │  5. ContactsAgent  — Contact matching             │")
    print(f"   │  6. SheetsAgent    — Spreadsheet analysis         │")
    print(f"   │  7. NotesAgent     — Smart note generation        │")
    print(f"   ├─ Analysis Agents ────────────────────────────────┤")
    print(f"   │  8. ConflictAgent  — Conflict detection           │")
    print(f"   │  9. PlanningAgent  — Schedule optimization        │")
    print(f"   │ 10. CoordinatorAgent — Final recommendations      │")
    print(f"   └──────────────────────────────────────────────────┘")
    print(f"\n   Google Services: {google_status}")
    
    print(f"\n📋 Choose input method:")
    print(f"   1. Enter schedule manually")
    print(f"   2. Use sample scenario")
    print(f"   3. 🌐 Plan day LIVE (Google auto-fetch)")
    print(f"   4. 🔗 Connect / Disconnect Google")
    print(f"   5. Exit")
    
    choice = input("\nYour choice (1-5): ").strip()
    
    if choice == "5":
        print("\n👋 Goodbye!")
        sys.exit(0)
    
    if choice == "4":
        google_connect()
        print("\n" + "="*60)
        input("Press Enter to return to menu...")
        main()  # Return to menu
        return
    
    if choice == "3":
        run_live_mode()
        return
    
    # Manual / Sample modes
    meetings = []
    tasks = []
    
    if choice == "1":
        meetings = get_meetings()
        tasks = get_tasks()
    elif choice == "2":
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
    
    # Initialize and run
    print("\n🤖 Initializing AI Multi-Agent System...")
    print("   This may take a moment as agents analyze your schedule...\n")
    
    try:
        agent_graph = ScheduleAgentGraph()
        print("🔄 Running 6-agent manual pipeline...")
        result = agent_graph.execute(meetings, tasks)
        display_results(result, mode="manual")
        
        save_choice = input("\n💾 Save results to file? (y/n): ").strip().lower()
        if save_choice == 'y':
            filename = f"schedule_analysis_{len(meetings)}m_{len(tasks)}t.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False, default=str)
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
