from datetime import timedelta
from utils.time_parser import parse_time

def travel_agent(meetings):
    """
    Travel Agent:
    Adds 30 minutes travel buffer before meetings
    """
    reminders = []

    for meeting in meetings:
        meeting_time = parse_time(meeting["time"])
        leave_time = meeting_time - timedelta(minutes=30)

        reminders.append(
            f"Leave for '{meeting['title']}' by {leave_time.strftime('%I:%M %p')}"
        )

    if reminders:
        return reminders
    return ["No travel reminders needed."]
