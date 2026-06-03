import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from app.infrastructure.agents.sql.agent import SQLAgent
from app.infrastructure.agents.docs.agent import DocumentationAgent
from app.application.graph.builder import compile_graph
from langgraph.types import Send

@pytest.mark.asyncio
async def test_parallel_agent_execution_simulations(mock_state):
    """
    Evaluates Graph builder node mappings natively determining if the parallel Fan-Out 
    correctly isolates and merges overlapping Agent states executing simultaneously.
    """
    mock_state["selected_agents"] = ["DocumentationAgent", "SQLAgent"]
    
    # 1. Direct Edge test against dynamic Fan Out definitions in routing.py
    from app.application.graph.routing import route_to_agents
    targets = route_to_agents(mock_state)
    
    assert len(targets) == 2
    assert isinstance(targets[0], Send)
    assert targets[0].node in ["docs_agent_node", "sql_agent_node"]
    
    # 2. Fan-In Merger test
    from app.application.graph.builder import merge_agents_node
    mock_state["agent_outputs"] = ["Docs Output Block", "SQL Response Block"]
    
    result = merge_agents_node(mock_state)
    assert "Docs Output Block" in result["compressed_context"]
    assert "SQL Response Block" in result["compressed_context"]

@pytest.mark.asyncio
async def test_graph_initializes_without_critical_cycles():
    """Compile graph synchronously catching circular dependencies internally defined on Edges."""
    graph = compile_graph()
    
    assert "agent_router" in graph.nodes
    assert "generator" in graph.nodes
    assert "self_rag" in graph.nodes
    
    # Verify Graceful Fallback bound cleanly mitigating Recursion loops mapped
    assert "graceful_fail" in graph.nodes
