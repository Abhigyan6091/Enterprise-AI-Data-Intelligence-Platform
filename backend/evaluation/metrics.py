import logging
from typing import Dict
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from app.infrastructure.llm.ollama import get_chat_model

logger = logging.getLogger(__name__)

class EvaluationFramework:
    """
    Offline local Evaluation Framework (LLM-as-a-Judge) simulating RAGAS metrics 
    without connecting to costly OpenAI grading endpoints.
    """
    def __init__(self):
        # We enforce completely deterministic grading via a strict zero-variance Ollama Model endpoint
        self.judge_llm = get_chat_model(temperature=0.0, max_tokens=100)

    def calculate_answer_relevancy(self, original_query: str, final_answer: str) -> float:
        """
        Determines how directly the final answer addressed the literal prompt avoiding tangent filler text.
        Returns a float between 0.0 and 1.0.
        """
        prompt = ChatPromptTemplate.from_template("""
        You are an impartial evaluator grading AI responses.
        Read the following Query and the AI's Answer. Score strictly on answer relevancy.
        Provide a float score strictly spanning 0.0 to 1.0 inside a JSON map under 'relevancy_score'.
        Query: {query}
        Answer: {answer}
        """)
        
        chain = prompt | self.judge_llm | JsonOutputParser()
        try:
            result = chain.invoke({"query": original_query, "answer": final_answer})
            return float(result.get("relevancy_score", 0.0))
        except Exception as e:
            logger.error(f"Evaluating Relevancy Failed mathematically: {str(e)}")
            return 0.0

    def batch_evaluate_graph_telemetry(self, queries: list, answers: list) -> Dict[str, float]:
        """Aggregate scoring pipeline simulating nightly regression telemetry checks."""
        scores = []
        for q, a in zip(queries, answers):
            scores.append(self.calculate_answer_relevancy(q, a))
            
        mean = sum(scores) / len(scores) if scores else 0.0
        logger.info(f"Nightly Batch Evaluation Complete. Mean Relevancy: {mean}")
        return {"mean_relevance": mean}
