from app.domain.models.state import PlatformState
from langgraph.types import Send
import logging

logger = logging.getLogger(__name__)

def check_hallucination(state: PlatformState) -> str:
    hallucination_score = state.get("hallucination_score", 0.0)
    iteration_count = state.get("reflection_iteration", 0)
    
    logger.debug(f"Assessing Hallucination Score: {hallucination_score} (Iteration {iteration_count})")
    context = state.get("compressed_context", "")
    logger.debug(f"Context length: {len(context)} chars")
    
    # Higher threshold for hallucination (0.9 instead of 0.8)
    if hallucination_score > 0.9 and len(context) > 100:
        if iteration_count >= 2:
            logger.warning("Reflection iteration limit reached. Proceeding with answer.")
            return "generate_citations"
        return "reflect"
    
    return "generate_citations"

def route_query_complexity(state: PlatformState) -> str:
    query_type = state.get("query_type", "factual")
    if query_type == "multi_faceted":
        return "decomposer"
    return "rewrite"

def route_to_agents(state: PlatformState):
    """
    Dynamic Fan-Out conditional edge utilizing the LangGraph Send API.
    Reads mapped agents assigned by the 'agent_router' and clones states securely to 
    spin up independent parallel concurrent sub-executions without blocking.
    """
    agents = state.get("selected_agents", [])
    
    # Mapping arbitrary logical names inferred by the LLM back to exact deployed node IDs
    node_mapping = {
        "DocumentationAgent": "docs_agent_node",
        "SQLAgent": "sql_agent_node",
        "CodeAgent": "code_agent_node",
        "AirflowAgent": "airflow_agent_node",
        "LineageAgent": "lineage_agent_node",
        "AnalyticsAgent": "analytics_agent_node"
    }
    
    logger.info(f"Fanning out dynamic concurrent parallel execution to: {agents}")
    
    sends = []
    for agent in agents:
        node_name = node_mapping.get(agent)
        if node_name:
            # We Send the entire state down individually. TypedDict reducers handle Fan-In collisions organically.
            sends.append(Send(node_name, state))
            
    # Fallback to standard document RAG if nothing was correctly mapped by the router LLM
    if not sends:
        sends.append(Send("docs_agent_node", state))
            
    return sends
