import json
import logging
import re
from pathlib import Path
from typing import Dict, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.infrastructure.llm.ollama import get_judge_model

logger = logging.getLogger(__name__)


def _extract_json(raw: str) -> dict:
    """Robust JSON extraction: try a direct parse first, then strip markdown
    fences/headings, then fall back to grabbing the first {...} block."""
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


def _clamp01(value, default: float = 0.0) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return default


def _basename(source_file: str) -> str:
    """Normalizes a chunk's source_file metadata (often a full path) to its filename."""
    return Path(source_file).name if source_file else ""


def recall_at_k(retrieved_sources: List[str], expected_source: str, k: int) -> float:
    """
    Binary Recall@K for a single-relevant-document query: 1.0 if the expected
    source file appears anywhere among the top-K retrieved chunk sources, else 0.0.
    Callers average this across a query set to get the aggregate Recall@K.
    """
    top_k = [_basename(s) for s in retrieved_sources[:k]]
    return 1.0 if _basename(expected_source) in top_k else 0.0


def reciprocal_rank(retrieved_sources: List[str], expected_source: str) -> float:
    """
    1 / rank of the first retrieved chunk whose source matches expected_source.
    0.0 if the expected source never appears in the retrieved list.
    """
    target = _basename(expected_source)
    for idx, source in enumerate(retrieved_sources, start=1):
        if _basename(source) == target:
            return 1.0 / idx
    return 0.0


def mean_reciprocal_rank(all_retrieved_sources: List[List[str]], expected_sources: List[str]) -> float:
    """Aggregate MRR across a batch of queries."""
    if not all_retrieved_sources:
        return 0.0
    scores = [
        reciprocal_rank(retrieved, expected)
        for retrieved, expected in zip(all_retrieved_sources, expected_sources)
    ]
    return sum(scores) / len(scores)

class EvaluationFramework:
    """
    Offline local Evaluation Framework (LLM-as-a-Judge) simulating RAGAS metrics 
    without connecting to costly OpenAI grading endpoints.
    """
    def __init__(self):
        # We enforce completely deterministic grading via a strict zero-variance Ollama Model
        # endpoint. format="json" makes Ollama constrain generation to valid JSON, which is what
        # actually fixes the parse-failure rate - a free-text prompt asking nicely for JSON is not
        # reliable enough on a small local model (it would sometimes wrap the JSON in a markdown
        # heading or fence despite being told not to).
        self.judge_llm = get_judge_model(temperature=0.0, max_tokens=200).bind(format="json")

    def calculate_answer_relevancy(self, original_query: str, final_answer: str) -> float:
        """
        Determines how directly the final answer addressed the literal prompt avoiding tangent filler text.
        Returns a float between 0.0 and 1.0.
        """
        prompt = ChatPromptTemplate.from_template("""
        You are an impartial evaluator grading AI responses.
        Read the Query and the AI's Answer.

        First, briefly note anything the Query asked for that the Answer did not address (or "none").
        Then score relevancy: 1.0 means the Answer directly and completely addresses the Query with
        no unrelated padding; 0.0 means it is off-topic or ignores the Query.

        Respond with ONLY this JSON object, no markdown, no prose outside it:
        {{"missed_aspects": "<your note, or \\"none\\">", "relevancy_score": <float 0.0-1.0>}}

        Query: {query}
        Answer: {answer}
        """)

        chain = prompt | self.judge_llm | StrOutputParser()
        try:
            raw = chain.invoke({"query": original_query, "answer": final_answer})
            result = _extract_json(raw)
            if not result:
                logger.warning(f"Answer relevancy judge output unparseable: {raw!r}")
            return _clamp01(result.get("relevancy_score"), 0.0)
        except Exception as e:
            logger.error(f"Evaluating Relevancy Failed mathematically: {str(e)}")
            return 0.0

    def calculate_faithfulness(self, context: str, final_answer: str) -> float:
        """
        Determines whether every claim in the answer is grounded strictly in the
        supplied retrieved context (no fabricated facts). Returns a float 0.0-1.0
        where 1.0 means fully grounded/faithful.
        """
        prompt = ChatPromptTemplate.from_template("""
        You are an impartial evaluator checking for hallucinations.
        Read the Context and the AI's Answer.

        Treat paraphrasing, reformatting (e.g. a CSV row "X,integer,6333,..." restated as prose
        "X = 6333"), and reasonable summarization as SUPPORTED, not unsupported. Only flag a claim
        as unsupported if it contradicts the Context or is genuinely absent from it entirely.

        First, briefly list any specific claim in the Answer that fails that test (or "none" if
        every claim is supported).
        Then score faithfulness: 1.0 means every claim in the Answer is grounded in the Context;
        0.0 means the Answer is fully fabricated. Score proportionally to how much is unsupported.

        Respond with ONLY this JSON object, no markdown, no prose outside it:
        {{"unsupported_claims": "<your list, or \\"none\\">", "faithfulness_score": <float 0.0-1.0>}}

        Context: {context}
        Answer: {answer}
        """)

        chain = prompt | self.judge_llm | StrOutputParser()
        try:
            raw = chain.invoke({"context": context, "answer": final_answer})
            result = _extract_json(raw)
            if not result:
                logger.warning(f"Faithfulness judge output unparseable: {raw!r}")
            return _clamp01(result.get("faithfulness_score"), 0.0)
        except Exception as e:
            logger.error(f"Evaluating Faithfulness Failed mathematically: {str(e)}")
            return 0.0

    def batch_evaluate_graph_telemetry(self, queries: list, answers: list) -> Dict[str, float]:
        """Aggregate scoring pipeline simulating nightly regression telemetry checks."""
        scores = []
        for q, a in zip(queries, answers):
            scores.append(self.calculate_answer_relevancy(q, a))
            
        mean = sum(scores) / len(scores) if scores else 0.0
        logger.info(f"Nightly Batch Evaluation Complete. Mean Relevancy: {mean}")
        return {"mean_relevance": mean}
