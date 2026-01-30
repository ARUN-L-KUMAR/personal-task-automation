from agents.calendar_agent import calendar_agent
from agents.task_agent import task_agent
from agents.conflict_agent import conflict_agent
from agents.travel_agent import travel_agent
from agents.planning_agent import planning_agent
from agents.llm_explanation_agent import llm_explanation_agent
from utils.file_handler import save_input, save_output, load_input


def get_meetings():
    meetings = []
    print("\nEnter meeting details (leave title empty to stop):")

    while True:
        title = input("Meeting title: ").strip()
        if not title:
            break

        time = input("Meeting time (e.g. 10:00 AM): ").strip()
        location = input("Meeting location: ").strip()

        meetings.append({
            "title": title,
            "time": time,
            "location": location
        })

    return meetings


def get_tasks():
    tasks = []
    print("\nEnter task details (leave title empty to stop):")

    while True:
        title = input("Task title: ").strip()
        if not title:
            break

        deadline = input("Task deadline (e.g. 11:00 AM): ").strip()

        tasks.append({
            "title": title,
            "deadline": deadline
        })

    return tasks


def process_and_display(meetings, tasks):
    calendar_result = calendar_agent(meetings)
    task_result = task_agent(tasks)
    conflict_result = conflict_agent(meetings, tasks)
    travel_result = travel_agent(meetings)
    planning_result = planning_agent(conflict_result)
    ai_explanation = llm_explanation_agent(conflict_result)

    save_output({
        "calendar_analysis": calendar_result,
        "task_analysis": task_result,
        "conflict_analysis": conflict_result,
        "travel_reminders": travel_result,
        "rule_based_plan": planning_result,
        "ai_explanation": ai_explanation
    })

    print("\n📅 Calendar Analysis:")
    print(calendar_result)

    print("\n📝 Task Analysis:")
    print(task_result)

    print("\n⚠️ Conflict Analysis:")
    for c in conflict_result:
        print("-", c)

    print("\n🚗 Travel Reminders:")
    for r in travel_result:
        print("-", r)

    print("\n📌 Rule-Based Plan:")
    if isinstance(planning_result, list):
        for p in planning_result:
            print("-", p)
    else:
        print(planning_result)

    print("\n🤖 AI Explanation:")
    print(ai_explanation)


def run_new_input():
    meetings = get_meetings()
    tasks = get_tasks()

    save_input({
        "meetings": meetings,
        "tasks": tasks
    })

    process_and_display(meetings, tasks)


def run_from_database():
    data = load_input()

    if not data:
        print("❌ No input data found in database.")
        return

    meetings = data.get("meetings", [])
    tasks = data.get("tasks", [])

    print("\nUsing data from database...\n")
    process_and_display(meetings, tasks)


def main():
    print("\n=== AI Personal Task Automation (CLI) ===")
    print("1. Enter new data")
    print("2. Use data from database")

    choice = input("Choose option (1/2): ").strip()

    if choice == "2":
        run_from_database()
    else:
        run_new_input()

    print("\n=== End of Analysis ===\n")


if __name__ == "__main__":
    main()
