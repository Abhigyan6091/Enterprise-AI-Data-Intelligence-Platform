import pytest
from unittest.mock import patch
from app.application.graph.nodes.router import agent_router_node
from app.application.graph.nodes.self_rag import self_rag_validator_node
from app.application.graph.nodes.reflection import reflection_node
from app.application.graph.nodes.rewriter import query_rewriter_node

@pytest.mark.asyncio
async def test_agent_router_node(mock_state):
    """Verifies that the Router LLM natively extracts and populates target mappings JSON schemas."""
    mock_state["rewritten_query"] = "Show me the pipeline DAG status."
    
    with patch("app.application.graph.nodes.router.get_chat_model") as mock_llm:
        # Mocking an explicit JSON block return mapping
        mock_chain = mock_llm.return_value.__or__.return_value.__or__.return_value
        mock_chain.invoke.return_value = {"selected": ["AirflowAgent"]}
        
        result = agent_router_node(mock_state)
        
        assert "AirflowAgent" in result["selected_agents"]
        assert len(result["selected_agents"]) == 1

def test_reflection_node(mock_state):
    """Verifies feedback concatenation strings and explicitly bounds iteration incrementing natively."""
    mock_state["reflection_iteration"] = 1
    mock_state["answer"] = "Hallucinated dataset facts."
    
    with patch("app.application.graph.nodes.reflection.get_chat_model") as mock_llm:
        mock_chain = mock_llm.return_value.__or__.return_value.__or__.return_value
        mock_chain.invoke.return_value = "Critique: Provide true context."
        
        result = reflection_node(mock_state)
        
        assert result["reflection_iteration"] == 2
        assert "Critique" in result["reflection_feedback"]

def test_self_rag_validator(mock_state):
    """Evaluates numeric threshold extractions mapping hallucination boundaries."""
    mock_state["answer"] = "Factual answer."
    
    with patch("app.application.graph.nodes.self_rag.get_chat_model") as mock_llm:
        mock_chain = mock_llm.return_value.__or__.return_value.__or__.return_value
        mock_chain.invoke.return_value = {"hallucination_score": 0.1, "confidence_score": 0.95}
        
        result = self_rag_validator_node(mock_state)
        
        assert result["hallucination_score"] == 0.1
        assert result["confidence_score"] == 0.95
