from app.domain.models.state import PlatformState

def evaluation_node(state: PlatformState) -> dict:
    """
    Final terminal node before exiting the Graph flow. 
    Aggregates full-cycle metrics such as total tokens burnt, and pushes them asynchronous to Postgres/LangSmith.
    """
    # Mocking downstream push of evaluation_metrics DB interactions
    metrics = state.get("evaluation_metrics", {})
    metrics["answer_fidelity_check"] = 1.0
    
    return {"evaluation_metrics": metrics}
