from langchain_ollama import ChatOllama
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_chat_model(temperature: float = 0.0, max_tokens: int = 2000) -> ChatOllama:
    """
    Standard Ollama local client instance for generative AI tasks inside the StateGraph.
    Native `.ainvoke()` execution is perfectly supported by the LangChain integration.
    Added explicit client timeouts to prevent unhandled starvation deadlocks.
    """
    # 120 seconds timeout guards FastAPI workers against runaway / looping inference.
    return ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        temperature=temperature,
        num_predict=max_tokens,
        timeout=120,
    )
