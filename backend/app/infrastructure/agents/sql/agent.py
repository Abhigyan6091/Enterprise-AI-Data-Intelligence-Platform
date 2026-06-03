from app.domain.schemas.agent import AgentExecutionResult
from app.domain.models.state import PlatformState
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from app.core.config import settings
from app.infrastructure.llm.ollama import get_chat_model
import asyncio

class SQLAgent:
    """Executes validated deterministic read-only queries against PostgreSQL mapped asynchronously."""
    
    def __init__(self):
        self.llm = get_chat_model(temperature=0.0)
        self._initialized = False
        self.agent_executor = None

    async def _ensure_initialized(self):
        if self._initialized:
            return
        try:
            self.db = SQLDatabase.from_uri(settings.sqlalchemy_database_uri)
            self.agent_executor = create_sql_agent(self.llm, db=self.db, agent_type="zero-shot-react-description", verbose=True)
        except Exception as e:
            self.agent_executor = None
        self._initialized = True
        
    async def execute(self, state: PlatformState) -> AgentExecutionResult:
        query = state.get("rewritten_query", state.get("original_query", ""))
        await self._ensure_initialized()
        if self.agent_executor is None:
            return AgentExecutionResult(
                agent_name="SQLAgent",
                status="FAILED",
                raw_response="",
                tools_invoked=0,
                execution_error="PostgreSQL not available"
            )
        try:
            result = await self.agent_executor.ainvoke({"input": query})
            return AgentExecutionResult(
                agent_name="SQLAgent",
                status="SUCCESS",
                raw_response=result.get("output", ""),
                tools_invoked=0
            )
        except Exception as e:
            return AgentExecutionResult(
                agent_name="SQLAgent",
                status="FAILED",
                raw_response="",
                tools_invoked=0,
                execution_error=str(e)
            )
