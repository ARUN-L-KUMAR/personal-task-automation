def task_agent(tasks):
    """
    Task Agent:
    Reads task deadlines
    """
    if not tasks:
        return "No tasks scheduled."

    formatted = []
    for task in tasks:
        formatted.append(f"{task['title']} due by {task['deadline']}")

    return "Tasks: " + ", ".join(formatted)
