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
    
    # The bare agent-name list this prompt used to have gave a small model nothing to
    # disambiguate on - a query like "the Qdrant vector database" would route to SQLAgent
    # purely because it contains the word "database", even though it's a documentation
    # question about a config setting. Each agent now gets a one-line scope description.
    prompt_text = """
    Analyze the incoming user query. Determine which domain agent(s) are required to fulfill it.

    Available agents and what each one actually covers:
    - DocumentationAgent: unstructured docs, markdown/text guides, config file contents,
      architecture explanations, "how does X work", definitions - anything answerable by
      searching indexed documents/files (including files that happen to mention databases,
      SQL, or code without querying a live system).
    - SQLAgent: running a live read-only query against the actual PostgreSQL database to fetch
      real rows/aggregates - NOT questions about the contents of a .sql example file.
    - CodeAgent: searching or explaining Python source code in the repository.
    - AirflowAgent: live Airflow DAG run status or task-instance state - NOT the static contents
      of a DAG definition file (that's DocumentationAgent).
    - LineageAgent: data lineage / downstream impact of a specific table or dataset.
    - AnalyticsAgent: pandas/dataframe-based numeric analysis over an in-memory dataset.

    If the query is about the contents of a document, config file, or code file rather than live
    system state, choose DocumentationAgent.

    Return a strictly formatted JSON dict with a key 'selected' mapping to a list of chosen agents.
    Query: {query}
    """
    
    prompt = ChatPromptTemplate.from_template(prompt_text)
    chain = prompt | llm | JsonOutputParser()
    
    result = chain.invoke({"query": query})
    
    return {"selected_agents": result.get("selected", ["DocumentationAgent"])}
