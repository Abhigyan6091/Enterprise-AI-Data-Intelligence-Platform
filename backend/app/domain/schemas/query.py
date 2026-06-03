from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class QueryProcessingRequest(BaseModel):
    query: str = Field(..., description="The original raw input query from the user.")
    session_id: str = Field(..., description="The unique conversation thread UUID.")
    user_id: Optional[str] = Field(None, description="The authenticated user identifier for RBAC.")

class CitationSchema(BaseModel):
    text: str = Field(..., description="A direct string excerpt from the retrieved document.")
    metadata: Dict[str, str] = Field(..., description="Source identifiers (file name, path, database).")
    relevance_score: float = Field(..., description="The Cross-Encoder reranked similarity score.")

class QueryProcessingResponse(BaseModel):
    final_answer: str = Field(..., description="Synthesized output string from the Generator node.")
    citations: List[CitationSchema] = Field(default_factory=list, description="Validated grounding sources.")
    confidence_score: float = Field(..., description="Model confidence metric preventing hallucinated statements.")
    latency_ms: float = Field(..., description="Total execution time of the StateGraph.")
    total_cost_usd: float = Field(..., description="Computed metric for LLM token API thresholds.")
