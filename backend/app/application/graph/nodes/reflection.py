from app.domain.models.state import PlatformState
from app.infrastructure.llm.ollama import get_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def reflection_node(state: PlatformState) -> dict:
    """
    Triggered solely when Self-RAG detects a hallucination threshold breach.
    Generates a localized critique and updates the iteration loops count to prevent graph exhaustion.
    """
    current_iter = state.get("reflection_iteration", 0)
    context = state.get("compressed_context", "")
    flawed_answer = state.get("answer", "")
    
    llm = get_chat_model(temperature=0.1)
    prompt = ChatPromptTemplate.from_template("""
    You are an AI critique engine. The following draft answer hallucinated details not present in the context.
    Context: {context}
    Flawed Answer: {flawed_answer}
    Identify precisely what was fabricated and provide strict instructions on how to rewrite it truthfully.
    """)
    
    chain = prompt | llm | StrOutputParser()
    critique = chain.invoke({"context": context, "flawed_answer": flawed_answer})
    
    return {
        "reflection_feedback": critique,
        "reflection_iteration": current_iter + 1
    }
