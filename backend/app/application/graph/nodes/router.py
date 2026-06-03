from app.domain.models.state import PlatformState
from app.infrastructure.llm.ollama import get_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

def agent_router_node(state: PlatformState) -> dict:
    """
    Semantically analyzes the query to determine which specialized Agents to invoke.
    Emits a List of target agents to populate the 'selected_agents' State variable.
    """
    query = state.get("rewritten_query", state.get("original_query", ""))
    llm = get_chat_model(temperature=0.0).bind(format="json")
    
    prompt_text = """
    Analyze the incoming user query. Determine which domain agents are required to fulfill it.
    Options: ["DocumentationAgent", "SQLAgent", "CodeAgent", "AirflowAgent", "LineageAgent", "AnalyticsAgent"]
    Return a strictly formatted JSON dict with a key 'selected' mapping to a list of chosen agents.
    Query: {query}
    """
    
    prompt = ChatPromptTemplate.from_template(prompt_text)
    chain = prompt | llm | JsonOutputParser()
    
    result = chain.invoke({"query": query})
    
    return {"selected_agents": result.get("selected", ["DocumentationAgent"])}
