import os
import ast
import logging
import asyncio
from typing import List
from app.domain.schemas.agent import AgentExecutionResult
from app.domain.models.state import PlatformState

logger = logging.getLogger(__name__)

class CodeAgent:
    """
    Operates offline processing complex codebase structural queries natively
    via Python AST traversing and structural blob mapping asynchronously.
    """
    def __init__(self, root_directory: str = "/data/RAG/backend"):
        self.root_directory = root_directory

    async def _extract_signatures(self, filepath: str) -> List[str]:
        """Maps out defined Classes and Functions leveraging threading preventing event loop locking."""
        if not filepath.endswith(".py") or not os.path.exists(filepath):
            return []
            
        try:
            # We enforce asyncio.to_thread because ast.parse is CPU bound and synchronous file read blocks IO
            def _parse_file(path):
                with open(path, "r", encoding="utf-8") as f:
                    node = ast.parse(f.read(), filename=path)
                entities = []
                for n in ast.walk(node):
                    if isinstance(n, ast.FunctionDef):
                        entities.append(f"Function: {n.name}()")
                    elif isinstance(n, ast.ClassDef):
                        entities.append(f"Class: {n.name}")
                return entities

            return await asyncio.to_thread(_parse_file, filepath)
            
        except SyntaxError as e:
            logger.warning(f"AST parse failed on {filepath}: {str(e)}")
            return []

    async def execute(self, state: PlatformState) -> AgentExecutionResult:
        query = state.get("rewritten_query", state.get("original_query", ""))
        
        target_file = os.path.join(self.root_directory, "app/application/graph/builder.py")
        structures = await self._extract_signatures(target_file)
        
        response = f"Repository scan over {target_file} completed. Parsed AST signatures mapping: {structures}"
        
        return AgentExecutionResult(
            agent_name="CodeAgent",
            status="SUCCESS",
            raw_response=response,
            tools_invoked=1
        )
