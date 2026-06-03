from app.domain.schemas.agent import AgentExecutionResult
from app.domain.models.state import PlatformState
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
import pandas as pd

class AnalyticsAgent:
    """
    A sandboxed agent capable of executing complex aggregations completely asynchronously.
    """
    def __init__(self, df: pd.DataFrame):
        from app.infrastructure.llm.ollama import get_chat_model
        llm = get_chat_model(temperature=0.0)
        self.agent = create_pandas_dataframe_agent(llm, df, verbose=True, allow_dangerous_code=True)
        
    async def execute(self, state: PlatformState) -> AgentExecutionResult:
        query = state.get("rewritten_query", state.get("original_query", ""))
        try:
            ans = await self.agent.ainvoke(query)
            return AgentExecutionResult(
                agent_name="AnalyticsAgent",
                status="SUCCESS",
                raw_response=ans.get("output", str(ans)),
                tools_invoked=1
            )
        except Exception as e:
            return AgentExecutionResult(
                agent_name="AnalyticsAgent",
                status="FAILED",
                raw_response="",
                tools_invoked=0,
                execution_error=str(e)
            )
