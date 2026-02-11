from langgraph.graph import StateGraph

def planning_node(state):
    state["ai_suggestions"] = state["planning_result"]
    return state

workflow = StateGraph(dict)
workflow.add_node("planning", planning_node)
workflow.set_entry_point("planning")

planning_graph = workflow.compile()
