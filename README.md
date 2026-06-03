# Enterprise AI Data Intelligence Platform

![Status](https://img.shields.io/badge/Status-Production%20Ready-success) ![Python](https://img.shields.io/badge/Python-3.11-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![LangGraph](https://img.shields.io/badge/LangGraph-Agentic-orange) ![License](https://img.shields.io/badge/License-MIT-green)

A production-grade, local-first multi-agent AI platform built for Data Engineers, Analytics Engineers, ML Engineers, and Platform Operators. Engineered to provide unprecedented observability and conversational investigation into complex data ecosystems seamlessly, accurately, and deterministically.

## 🌟 Overview

The **Enterprise AI Data Intelligence Platform** transcends standard chatbot interfaces by functioning as an intelligent investigation toolkit. Through a deeply integrated, resilient multi-agent orchestration architecture powered by **LangGraph**, it enables engineers to instantaneously query ETL pipelines, dissect Airflow DAGs, investigate data lineage, explore granular SQL warehouse metadata, and search internal documentation.

By strictly standardizing on a **local-first deployment** (Ollama, BGE embeddings, Qdrant Vector Search), the platform prevents proprietary data exfiltration to cloud providers while ensuring enterprise-level security, unbounded horizontal scalability, and zero API costs.

---

## 🏗️ Detailed Architecture

The system is strictly decoupled into distinct **Domain**, **Application**, **Infrastructure**, and **Frontend** layers following Clean Architecture and Domain-Driven Design (DDD) principles. 

### 1. The Multi-Agent Orchestration Engine (Backend)

Powered by **LangGraph**, the backend avoids linear chain executions in favor of a dynamic, cyclic state machine capable of self-reflection, hallucination mitigation, and parallel fan-out concurrency.

- **Query Rewriter**: Normalizes user intent and optimizes vague queries into dense, targeted semantics.
- **Agent Router**: Uses LLM classification to route the query to one or more specialized domain agents synchronously.
- **Dynamic Fan-Out (Concurrency)**: Utilizes LangGraph's `Send()` API to clone the `PlatformState` securely. If a query hits both Code and Airflow bounds, independent parallel threads resolve simultaneously without I/O blocking.
- **Self-RAG Validator & Reflection**: All generated answers are graded deterministically by a zero-temperature LLM-as-a-judge. If the response hallucination score exceeds `0.8`, the graph loops backward, appending critique strings, and forces a re-generation until factual alignment is validated natively (Max 3 loops before Graceful Degradation).
- **Memory Checkpointer**: Anchored by LangGraph `AsyncRedisSaver`, managing asynchronous thread states allowing persistent multi-turn conversations safely bonded to strict `7-day TTL` policies to prevent RAM leakage over time.

### 2. Specialized External Agents

Each agent is sandboxed and operates asynchronously over its specific domain:
*   **Documentation Agent**: Engages unstructured text via advanced Hybrid RAG strategies.
*   **SQL Agent**: Deterministic, read-only PostgreSQL querying via `zero-shot-react-description` chains bridging explicit data validations natively.
*   **Code Agent**: Natively parses massive Python AST blobs via non-blocking `asyncio.to_thread` traversing local filesystem scopes without memory spiking.
*   **Airflow Agent**: Executes precise REST bounds natively diagnosing DAG statuses securely over `aiohttp.ClientSession`.
*   **Lineage Agent**: Evaluates exact mappings and downstream entity impacts iteratively bridging source catalog trees.
*   **Analytics Agent**: An aggressive sandboxed Pandas execution agent mapping heavy dataframe permutations.

### 3. High-Performance Retrieval Pipeline

Scaling beyond primitive vector search, the retrieval architecture isolates the CPU-heavy cross-encoder bottlenecks:
*  **CacheBackedEmbeddings**: Utilizes Redis to sidestep redundant CPU matrix compute burns during iterative fetches.
*  **Adaptive Top-K Pruning**: Identifies query complexity computationally, intelligently pruning broad RRF aggregates down (Max K=25) protecting Cross-Encoder saturation natively.
*  **Reciprocal Rank Fusion**: Flawlessly combines Dense vectors (Qdrant) and Sparse mappings (BM25) dynamically. 
*  **Cross-Encoder Reranking**: Executes exactly against localized BAAI models (`bge-reranker-large`) producing pristine chunk scoring natively.

### 4. Client-Side UX Architecture (Frontend)

Built with **Next.js 15**, the Frontend is completely stripped of distracting animations in favor of clinical observability usability reminiscent of Datadog, GitHub, and Linear.

*   **Keyboard-First Navigation**: Driven by a global Cmd+K Command Palette navigating workspaces quickly.
*   **Retrieval Inspector**: A 4-column diagnostic timeline dissecting exact chunks dropped between Dense → BM25 → RRF → Compressed layers.
*   **Agent Execution Timeline & Monitor**: Observability pane monitoring Circuit Breaker states natively tracking specific Agent Latency profiles mapping exact SLA drops instantly.
*   **Data Lineage Explorer**: Real-time DAG canvases leveraging `React Flow`.

---

## 🛠️ Tech Stack

**Backend System**
- **Core Orchestrator**: LangGraph (Agentic Graph States), LangChain
- **API Engine**: FastAPI (ASGI), Uvicorn
- **LLM Inferencing**: Ollama (Local runtime API) (`num_predict=2000`)
- **Embeddings & Reranking**: HuggingFace (`BAAI/bge-large-en-v1.5`, `BAAI/bge-reranker-large`)
- **Concurrency**: Native Python `asyncio`, `aiohttp`

**Persistence & Vector Storage**
- **Vector DB**: Qdrant (`AsyncQdrantClient`) via Cosine distance maps
- **Relational DB**: PostgreSQL (Asyncpg bindings)
- **Checkpointer & Caching**: Redis (`redis.asyncio`)

**Frontend System**
- **Framework**: Next.js 15 (App Router), React 19
- **Languages**: TypeScript
- **Styling**: Tailwind CSS (`@tailwindcss/postcss`), Shadcn UI
- **State Management**: Zustand (Client UI States), TanStack React Query (Server fetching)
- **Visualizations**: React Flow (Node Graphs), Recharts (Evaluation telemetry)

**DevOps & Reliability**
- **Fault-Tolerance**: Circuit Breaker Pattern & Exponential Backoff (`tenacity`)
- **Testing**: Pytest (Mocked LLMs, AST trees, load faults), Locust (Load testing)

---

## 📊 Data Ingestion Pipeline

The platform is fortified with a lightweight but exceptionally thorough Data Ingestion engine optimized for contextual retrieval pipelines. All documents are broken apart utilizing intelligent sliding windows, vectorized via BGE-Large, and dynamically indexed directly into the Qdrant backend securely. 

### Supported Formats & Intelligent Chunking Constraints
| Format | Mechanism | Chunking Algorithm Strategy | Context |
|---|---|---|---|
| `.md` / `.txt` | Standard Unstructured | Paragraph-based (Max 1024 char, Min 256) | Breaks precisely on `\n\n` avoiding mid-sentence decapitation. |
| `.py` / `.sql` | Structural Syntactic | Line-based (20 line blocks) | Explicitly preserves a rolling **2-line overlapping context** window guaranteeing logic jumps are retained across chunks. | 
| `.csv`       | Tabular / Data arrays | Paragraph-based (256-1024 chars)| Maps configurations effectively maintaining flat schemas. |

### The Ingestion Sequence 
1. **Recursion & Discovery**: Executes over target nodes retrieving targeted `.py`, `.sql`, `.txt`, `.md` binaries.
2. **Parsing**: Executes custom loading strategies mapping exact file parsing logic avoiding Unicode corruption natively.
3. **Sliding Embeddings Map**: Batched concurrently tracking dimensions exactly toward `1024` vectors mapping via the BAAI LLM instance cached explicitly inside Redis avoiding double-processing the same nodes.
4. **Metadata Extraction Mapping**: Crucial for tracing hallucinated claims. Every single subset retains:
    - `source_file`
    - `file_type`
    - `chunk_id`
    - `ingestion_timestamp`
    - `chunk_size`
5. **Upsertion**: Shipped asynchronously into the Qdrant `enterprise_knowledge` collections guaranteeing searchability across downstream Agent clusters.

---

## 🛡️ Reliability & Fault Tolerance

The true distinction of this project is its rigid engineering tolerance:
- **No Node-level Retries**: LangGraph edges dictate transitions. Adding standard retries inside graph nodes pollutes core paths. Instead, **Async Circuit Breakers** wrap around exact network bridges natively guarding the Uvicorn execution loop.
- **Fail Fast Capabilities**: If the local GPU container powering Ollama goes cold, the endpoint `qdrant_breaker` and `ollama_breaker` trigger OPEN blocking traffic instantly after `N` thresholds preserving ASGI capacity limits. 
- **Graceful Failsaves**: When hallucination loops breach limits (3 iterations), Graph topologies explicitly route back entirely reporting *"Insufficient validated context out-of-bounds"*, prioritizing data fidelity over hallucinated confidence.

## 🚀 Future Integrations 
- Complete the Next.js Client Interface mapping full websockets mapping.
- Wire native Snowflake Data Catalog mappings downstream into the Lineage Explorer instance securely.
- Construct CI/CD golden-dataset regression loops evaluating new Embeddings variations dynamically over nights.
