from langgraph.graph import StateGraph, END
from app.domain.models.state import PlatformState

from app.application.graph.nodes.rewriter import query_rewriter_node
from app.application.graph.nodes.router import agent_router_node
from app.application.graph.nodes.generator import generator_node
from app.application.graph.nodes.self_rag import self_rag_validator_node
from app.application.graph.nodes.reflection import reflection_node
from app.application.graph.nodes.citation import citation_generator_node
from app.application.graph.nodes.evaluation import evaluation_node

from app.application.graph.routing import check_hallucination, route_to_agents

from app.infrastructure.agents.sql.agent import SQLAgent
from app.infrastructure.agents.docs.agent import DocumentationAgent
from app.infrastructure.agents.code.agent import CodeAgent
from app.infrastructure.agents.airflow.agent import AirflowAgent
from app.infrastructure.agents.lineage.agent import LineageAgent
from app.infrastructure.agents.analytics.agent import AnalyticsAgent
import pandas as pd

# Agent Wrapper Nodes bridging native Python classes back to explicit Graph mappings safely
async def docs_agent_node(state: PlatformState) -> dict:
    # DocumentationAgent will retrieve from Qdrant 'enterprise_knowledge' collection
    agent = DocumentationAgent()
    res = await agent.execute(state)
    return {"agent_outputs": [f"Documentation Findings:\n{res.raw_response}"]}

async def sql_agent_node(state: PlatformState) -> dict:
    agent = SQLAgent()
    res = await agent.execute(state)
    return {"agent_outputs": [f"SQL Warehouse Query Result:\n{res.raw_response}"]}
    
async def code_agent_node(state: PlatformState) -> dict:
    agent = CodeAgent()
    res = await agent.execute(state)
    return {"agent_outputs": [f"Code Repository Search:\n{res.raw_response}"]}
    
async def airflow_agent_node(state: PlatformState) -> dict:
    agent = AirflowAgent()
    res = await agent.execute(state)
    return {"agent_outputs": [f"Airflow Pipeline Diagnostics:\n{res.raw_response}"]}
    
async def lineage_agent_node(state: PlatformState) -> dict:
    agent = LineageAgent()
    res = await agent.execute(state)
    return {"agent_outputs": [f"Data Lineage Map:\n{res.raw_response}"]}
    
async def analytics_agent_node(state: PlatformState) -> dict:
    df = pd.DataFrame({"revenue": [100000, 120000, 115000, 140000, 155000], "period": ["Q1", "Q2", "Q3", "Q4", "Q1"]})
    agent = AnalyticsAgent(df)
    res = await agent.execute(state)
    return {"agent_outputs": [f"Pandas Mathematical Sandbox Output:\n{res.raw_response}"]}
    
def merge_agents_node(state: PlatformState) -> dict:
    """
    Fan-In synchronization node orchestrating state aggregations from concurrent agents.
    Safely concatenates chunk arrays and text block strings dynamically prior to generation.
    """
    outputs = state.get("agent_outputs", [])
    chunks = state.get("retrieved_chunks", [])
    
    compressed_text = "\n\n---\n\n".join(outputs)
    
    if chunks:
        qdrant_text = "\n\nVector Explicit Context:\n" + "\n".join([c.page_content for c in chunks])
        compressed_text += qdrant_text
        
    return {"compressed_context": compressed_text}

def compile_graph():
    workflow = StateGraph(PlatformState)
    
    workflow.add_node("query_rewriter", query_rewriter_node)
    workflow.add_node("agent_router", agent_router_node)
    
    # Registering Agent Logic Sub-nodes
    workflow.add_node("docs_agent_node", docs_agent_node)
    workflow.add_node("sql_agent_node", sql_agent_node)
    workflow.add_node("code_agent_node", code_agent_node)
    workflow.add_node("airflow_agent_node", airflow_agent_node)
    workflow.add_node("lineage_agent_node", lineage_agent_node)
    workflow.add_node("analytics_agent_node", analytics_agent_node)
    
    workflow.add_node("merge_agents_node", merge_agents_node)
    workflow.add_node("generator", generator_node)
    
    workflow.add_node("self_rag", self_rag_validator_node)
    workflow.add_node("reflection", reflection_node)
    workflow.add_node("citation", citation_generator_node)
    workflow.add_node("evaluation", evaluation_node)
    
    workflow.add_node("graceful_fail", lambda state: {"answer": "I have insufficient verified context to answer this query safely out-of-bounds."})
    
    # Connecting the Graph structural backbone
    workflow.set_entry_point("query_rewriter")
    workflow.add_edge("query_rewriter", "agent_router")
    
    # 🚀 Applying Dynamic Fan-Out Conditional Edge
    workflow.add_conditional_edges(
        "agent_router",
        route_to_agents,
        [
            "docs_agent_node",
            "sql_agent_node",
            "code_agent_node",
            "airflow_agent_node",
            "lineage_agent_node",
            "analytics_agent_node"
        ]
    )
    
    # 🧲 Consolidating Fan-In synchronization back to aggregator
    workflow.add_edge("docs_agent_node", "merge_agents_node")
    workflow.add_edge("sql_agent_node", "merge_agents_node")
    workflow.add_edge("code_agent_node", "merge_agents_node")
    workflow.add_edge("airflow_agent_node", "merge_agents_node")
    workflow.add_edge("lineage_agent_node", "merge_agents_node")
    workflow.add_edge("analytics_agent_node", "merge_agents_node")
    
    workflow.add_edge("merge_agents_node", "generator")
    workflow.add_edge("generator", "self_rag")
    
    workflow.add_conditional_edges(
        "self_rag",
        check_hallucination,
        {
            "reflect": "reflection",
            "generate_citations": "citation",
            "graceful_fail": "graceful_fail"
        }
    )
    
    workflow.add_edge("reflection", "generator")
    workflow.add_edge("citation", "evaluation")
    workflow.add_edge("graceful_fail", "evaluation")
    workflow.add_edge("evaluation", END)
    
    return workflow.compile()
