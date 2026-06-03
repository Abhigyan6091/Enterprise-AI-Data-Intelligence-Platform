import json
import logging
from typing import List, Dict
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.infrastructure.llm.ollama import get_chat_model

logger = logging.getLogger(__name__)

class BenchmarkGenerator:
    """
    Synthesizes massive volume Golden Datasets representing exact factual queries mapping to 
    stored unstructured knowledge nodes allowing CI/CD test automation.
    """
    def __init__(self):
        # Utilizing a slightly higher temperature forcing creativity mimicking actual unpredictable user requests
        self.llm = get_chat_model(temperature=0.6)

    def generate_qa_pairs_from_chunk(self, document_context: str, num_pairs: int = 3) -> List[Dict[str, str]]:
        """
        Generates synthetic Question-Answer permutations strictly bounding facts within context chunks.
        """
        prompt = ChatPromptTemplate.from_template("""
        You are an expert test data engineer generating regression datasets mapping unstructured context.
        Read the provided text and formulate exactly {num_pairs} difficult questions alongside concise factual answers.
        
        Format your response EXACTLY as a raw stringified JSON Array containing dictionaries mapping 'question' and 'answer':
        Context: {context}
        """)
        
        chain = prompt | self.llm | StrOutputParser()
        
        try:
            # We enforce standard parsing extraction mitigating unpredictable markdown wrapping occasionally deployed by raw Mixtral/Ollama instances
            raw = chain.invoke({"context": document_context, "num_pairs": num_pairs})
            raw = raw.replace("```json", "").replace("```", "").strip()
            
            pairs = json.loads(raw)
            return pairs
        except Exception as e:
            logger.error(f"Failed parsing synthesized permutations JSON: {str(e)}")
            return []
