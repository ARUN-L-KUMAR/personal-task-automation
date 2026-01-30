def calendar_agent(meetings):
    """
    Calendar Agent:
    Reads meeting schedule and returns formatted info
    """
    if not meetings:
        return "No meetings scheduled."

    formatted = []
    for meeting in meetings:
        formatted.append(f"{meeting['title']} at {meeting['time']} in {meeting['location']}")

    return "Meetings: " + ", ".join(formatted)
