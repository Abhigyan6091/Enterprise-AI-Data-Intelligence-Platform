from pydantic import BaseModel, Field
from typing import Optional

class AgentExecutionResult(BaseModel):
    """
    Standardized payload capturing any arbitrary agent's operational outcome, preventing
    the StateGraph from encountering misaligned dict returns.
    """
    agent_name: str = Field(..., description="The identifier of the deployed agent (e.g., 'SQL_Agent').")
    status: str = Field(..., description="Terminal state of the execution: 'SUCCESS', 'FAILED', or 'PARTIAL'.")
    raw_response: str = Field(..., description="The stringified output (like rows fetched or code blocks).")
    tools_invoked: int = Field(..., description="Number of underlying function tools fired during reasoning.")
    execution_error: Optional[str] = Field(None, description="Explicit stack trace or API restriction caught by Retry nodes.")
