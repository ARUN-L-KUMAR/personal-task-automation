def planning_agent(conflicts):
    """
    Planning Agent:
    Suggests solutions based on conflicts
    """
    if "No conflicts detected." in conflicts:
        return "Schedule looks good! You can proceed as planned."

    suggestions = []
    for conflict in conflicts:
        suggestions.append(
            f"Suggestion: Reschedule the task or adjust meeting time to avoid conflict."
        )

    return suggestions
