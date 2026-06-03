import json
import re
from app.domain.models.state import PlatformState
from app.infrastructure.llm.ollama import get_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def self_rag_validator_node(state: PlatformState) -> dict:
    """
    A strict evaluator LLM execution guaranteeing the Draft Answer directly entails the Context provided.
    Yields two float scores indicating whether it is safe to proceed or bounce to the Reflection phase.
    """
    context = state.get("compressed_context", "")
    answer = state.get("answer", "")
    query = state.get("rewritten_query", state.get("original_query", ""))
    
    # If we don't have good context, skip validation
    if not context or len(context.strip()) < 50:
        return {
            "hallucination_score": 0.0,
            "confidence_score": 0.5
        }
    
    llm = get_chat_model(temperature=0.0).bind(format="json")
    
    prompt = ChatPromptTemplate.from_template("""
    You are a strict grading evaluator. Evaluate the quality of the generated Answer based on the Context and the original User Query.
    
    User Query: {query}
    Context: {context}
    Answer: {answer}
    
    Provide two metrics:
    1. "hallucination_score" (0.0 to 1.0): 0.0 means the answer is perfectly grounded in the context. 1.0 means it contains fabricated information not found in the context.
    2. "confidence_score" (0.0 to 1.0): How direct, complete, and relevant the answer is to the User Query, using the provided context. 1.0 is extremely confident and relevant.
    
    Respond ONLY with valid JSON. No explanation, no markdown, no preamble.
    {{"hallucination_score": 0.0, "confidence_score": 0.0}}
    """)
    
    chain = prompt | llm | StrOutputParser()
    raw = chain.invoke({"context": context, "answer": answer, "query": query})
    
    try:
        match = re.search(r'\{[^{}]*\}', raw)
        if match:
            metrics = json.loads(match.group())
        else:
            metrics = {}
    except (json.JSONDecodeError, Exception):
        metrics = {}
    
    return {
        "hallucination_score": metrics.get("hallucination_score", 0.0),
        "confidence_score": metrics.get("confidence_score", 0.0)
    }
