import random
from locust import HttpUser, task, between

class PlatformSimulationUser(HttpUser):
    """
    Locust Test Execution user. Run natively against deployed Docker cluster targeting 
    FastAPI Endpoints analyzing specific API/WebSocket saturation levels structurally.
    
    Execution Run: `locust -f load/locustfile.py --host=http://localhost:8000 --users=100 --spawn-rate=10`
    """
    
    # Wait spans bounding typical interaction gaps mimicking human read cycles
    wait_time = between(2, 6)

    @task(3)
    def standard_unstructured_query(self):
        """Simulates Standard RAG execution mapping primarily Documentation Agents mapping."""
        payload = {
            "query": "Can you explain the architecture configuration?",
            "session_id": f"load_test_session_{random.randint(1000, 9999)}"
        }
        # Awaiting FastAPI Entrypaths bounding chat sequences
        with self.client.post("/api/v1/chat", json=payload, catch_response=True) as response:
            if response.elapsed.total_seconds() > 15.0:
                response.failure(f"Execution Latency breached SLA thresholds natively: {response.elapsed.total_seconds()}s")

    @task(1)
    def intensive_parallel_query(self):
        """Simulates intense Fan-Out queries traversing multiple APIs/DBs simultaneously."""
        payload = {
            "query": "Cross check DAG pipeline dependencies against PostgreSQL storage capacities natively.",
            "session_id": f"load_test_session_{random.randint(1000, 9999)}"
        }
        self.client.post("/api/v1/chat", json=payload)
