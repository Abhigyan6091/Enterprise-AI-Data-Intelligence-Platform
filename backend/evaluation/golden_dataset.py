"""
Hand-authored golden QA set for the demo_docs corpus.

Each entry maps a natural-language query to the source_file that actually
contains the answer (ground truth for Recall@K / MRR) and a short reference
answer (ground truth for faithfulness / relevance judging context).

Ground truth was derived by reading demo_docs/*.md/.txt/.csv/.sql/.py directly,
not generated synthetically, so retrieval correctness can be checked exactly.
"""

GOLDEN_QA = [
    # data-pipeline.md
    {
        "query": "What is the peak throughput of the enterprise data pipeline?",
        "expected_source": "data-pipeline.md",
        "reference_answer": "500K records/second",
    },
    {
        "query": "What are the three storage tiers used in the data pipeline's storage layer?",
        "expected_source": "data-pipeline.md",
        "reference_answer": "Hot Storage (last 90 days), Warm Storage (90 days-2 years), Cold Storage (2+ years archive)",
    },
    {
        "query": "What conditions trigger alerting in the data pipeline?",
        "expected_source": "data-pipeline.md",
        "reference_answer": "Pipeline failures, data quality drops (schema violations > 5%), latency degradation (p95 > threshold), delivery failures",
    },
    # embedding-basics.txt
    {
        "query": "In what year was Word2Vec introduced?",
        "expected_source": "embedding-basics.txt",
        "reference_answer": "2013",
    },
    {
        "query": "What are the three distance metrics used to compare embeddings?",
        "expected_source": "embedding-basics.txt",
        "reference_answer": "Cosine Similarity, Euclidean Distance, Manhattan Distance",
    },
    {
        "query": "What is the typical dimensionality of sentence embeddings?",
        "expected_source": "embedding-basics.txt",
        "reference_answer": "768-1024 dimensions",
    },
    # sample-config.csv
    {
        "query": "What is the default value for the RETRIEVAL_K setting?",
        "expected_source": "sample-config.csv",
        "reference_answer": "10",
    },
    {
        "query": "What is the default OLLAMA_MODEL configured in the sample config?",
        "expected_source": "sample-config.csv",
        "reference_answer": "llama2:70b",
    },
    {
        "query": "What is the default port for the Qdrant vector database in the config?",
        "expected_source": "sample-config.csv",
        "reference_answer": "6333",
    },
    # sql-queries.sql
    {
        "query": "What columns does the daily revenue summary SQL query return?",
        "expected_source": "sql-queries.sql",
        "reference_answer": "order_day, daily_revenue, order_count, unique_customers, avg_order_value",
    },
    {
        "query": "How is customer lifetime value (CLV) calculated in the SQL queries?",
        "expected_source": "sql-queries.sql",
        "reference_answer": "By joining customers and orders, summing total_amount per customer as lifetime_revenue along with order counts and dates",
    },
    {
        "query": "What CTEs are used in the cohort analysis SQL query?",
        "expected_source": "sql-queries.sql",
        "reference_answer": "first_purchase and user_activity",
    },
    # example-dag.py
    {
        "query": "What is the schedule interval for the enterprise_etl_pipeline Airflow DAG?",
        "expected_source": "example-dag.py",
        "reference_answer": "'0 2 * * *' (daily at 2 AM UTC)",
    },
    {
        "query": "What is the task execution order in the example Airflow DAG?",
        "expected_source": "example-dag.py",
        "reference_answer": "extract_data >> validate_data >> transform_data >> load_data >> notify_success",
    },
    {
        "query": "How many retries and what retry delay are configured in the DAG's default_args?",
        "expected_source": "example-dag.py",
        "reference_answer": "2 retries with a 5 minute retry_delay",
    },
]
