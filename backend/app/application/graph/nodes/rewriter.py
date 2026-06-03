from app.domain.models.state import PlatformState
from app.infrastructure.llm.ollama import get_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def query_rewriter_node(state: PlatformState) -> dict:
    """
    Reformulates the original user query optimizing it for dense vector similarity.
    Replaces conversational terms with deterministic keywords.
    """
    original = state.get("original_query", "")
    
    meta_keywords = ["retrieve", "document", "citation", "debug", "trace", "source", "evidence"]
    query_lower = original.lower()
    if any(k in query_lower for k in meta_keywords):
        return {"rewritten_query": original}
        
    llm = get_chat_model(temperature=0.0)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert at optimizing search queries for vector databases. Extract keywords and eliminate vague conversational words. Do NOT add new topics that were not mentioned. Return only the rewritten string. If the query is already optimal or a simple greeting, return it exactly as is."),
        ("human", "{query}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    new_query = chain.invoke({"query": original})
    
    return {"rewritten_query": new_query}
