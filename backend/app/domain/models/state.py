from typing import TypedDict, List, Dict, Any, Annotated
import operator
from langchain_core.messages import BaseMessage
from langchain_core.documents import Document

class PlatformState(TypedDict):
    """
    Immutable State Graph Payload carrying context across multi-agent routes, RAG operations,
    and telemetry nodes. Upgraded with Reducers (`operator.add`) to support dynamic LangGraph Fan-Out.
    """
    
    # 1. Routing & Rewrite
    original_query: str
    rewritten_query: str
    decomposed_queries: List[str]
    query_type: str
    selected_agents: List[str]
    
    # 2. Multi-Agent & Memory
    chat_history: List[BaseMessage]
    agent_scratchpad: Annotated[List[BaseMessage], operator.add]
    
    # 3. Enhanced RAG & Parallel Aggregation Reducers
    retrieved_chunks: Annotated[List[Document], operator.add]
    reranked_chunks: Annotated[List[Document], operator.add]
    agent_outputs: Annotated[List[str], operator.add]
    
    compressed_context: str
    graph_context: Dict[str, Any]
    
    # 4. Generation & Grounding
    answer: str
    citations: Annotated[List[Dict[str, str]], operator.add]
    
    # 5. Reflection & Evaluation
    confidence_score: float
    hallucination_score: float
    reflection_iteration: int
    reflection_feedback: str
    evaluation_metrics: Dict[str, float]
    
    # 6. Observability
    token_usage: Dict[str, int]
    cost_tracking: float
    latency: Dict[str, float]
