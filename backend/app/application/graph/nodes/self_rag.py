import json
import logging
import re
from app.core.fault_tolerance import ollama_breaker
from app.domain.models.state import PlatformState
from app.infrastructure.llm.ollama import get_judge_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

logger = logging.getLogger(__name__)


def _extract_json(raw: str) -> dict:
    """Robust JSON extraction: try a direct parse first, then strip markdown
    fences, then fall back to grabbing the first {...} block."""
    for candidate in (raw, raw.replace("```json", "").replace("```", "").strip()):
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            continue
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def _clamp01(value, default: float) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return default


@ollama_breaker
async def self_rag_validator_node(state: PlatformState) -> dict:
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

    llm = get_judge_model(temperature=0.0).bind(format="json")

    # Two things were tuned into this prompt after direct testing against real pipeline
    # output, not just guesswork:
    # 1. No literal example value in the schema (e.g. showing {"hallucination_score": 0.0}
    #    as a formatting example) - the model was found to just echo that exact number back
    #    regardless of the actual answer.
    # 2. An explicit instruction that paraphrasing / reformatting counts as SUPPORTED - without
    #    it, the judge would mark a correct answer like "QDRANT_PORT = 6333" as fully
    #    hallucinated because the context stated it as a CSV row ("QDRANT_PORT,integer,6333,...")
    #    rather than that exact prose. It still isn't perfectly reliable on dense tabular
    #    context with many similar-looking rows - that's a real limitation of a 3B local model
    #    doing NLI-style verification, not something prompting alone fully solves.
    prompt = ChatPromptTemplate.from_template("""
    You are a careful fact-checker. Read the Context and the Answer.

    Judge whether the Answer's claims are supported by the Context. Treat paraphrasing,
    reformatting (e.g. turning a CSV row "X,integer,6333,..." into prose like "X = 6333" or
    "X is 6333"), unit conversions, and reasonable summarization as SUPPORTED - not unsupported.
    Only mark something unsupported if it states a fact, number, or name that contradicts the
    Context, or is genuinely absent from it entirely.

    User Query: {query}
    Context: {context}
    Answer: {answer}

    Score two things:
    - hallucination_score (0.0-1.0): fraction of the Answer that is genuinely unsupported or
      contradicted per the rule above. A correct, well-grounded answer should score near 0.0.
    - confidence_score (0.0-1.0): how directly and completely the Answer addresses the Query.

    Respond with ONLY this JSON object, no markdown, no prose outside it:
    {{"hallucination_score": <float 0.0-1.0>, "confidence_score": <float 0.0-1.0>}}
    """)

    chain = prompt | llm | StrOutputParser()
    try:
        raw = await chain.ainvoke({"context": context, "answer": answer, "query": query})
    except Exception as e:
        logger.error(f"self_rag_validator_node LLM call failed: {e}")
        return {"hallucination_score": 0.0, "confidence_score": 0.5}

    metrics = _extract_json(raw)
    if not metrics:
        logger.warning(f"self_rag_validator_node: could not parse judge output: {raw!r}")

    return {
        "hallucination_score": _clamp01(metrics.get("hallucination_score"), 0.0),
        "confidence_score": _clamp01(metrics.get("confidence_score"), 0.5),
    }
