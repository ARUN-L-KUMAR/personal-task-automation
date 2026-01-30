from utils.time_parser import parse_time

def conflict_agent(meetings, tasks):
    """
    Conflict Agent:
    Checks if task deadline overlaps with meeting time
    """
    conflicts = []

    for meeting in meetings:
        meeting_time = parse_time(meeting["time"])

        for task in tasks:
            task_deadline = parse_time(task["deadline"])

            # Conflict if within 1 hour
            if abs((task_deadline - meeting_time).total_seconds()) < 3600:
                conflicts.append(
                    f"Conflict between '{meeting['title']}' and task '{task['title']}'"
                )

    if conflicts:
        return conflicts
    return ["No conflicts detected."]
