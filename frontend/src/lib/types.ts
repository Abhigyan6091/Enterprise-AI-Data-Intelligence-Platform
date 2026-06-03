export interface Citation {
  text: string
  metadata: Record<string, string>
  relevance_score: number
}

export interface QueryResponse {
  final_answer: string
  citations: Citation[]
  confidence_score: number
  latency_ms: number
  total_cost_usd: number
}

export interface AgentResult {
  agent_name: string
  status: "SUCCESS" | "FAILED" | "PARTIAL"
  raw_response: string
  tools_invoked: number
  execution_error: string | null
}

export interface RetrievalChunk {
  content: string
  metadata: Record<string, string>
  score: number
  source: string
}

export interface TimelineEvent {
  node: string
  status: "running" | "completed" | "failed" | "skipped"
  started_at: number
  duration_ms: number
  agent_name?: string
  input?: string
  output?: string
  error?: string
}

export interface LineageNode {
  id: string
  type: "source" | "transform" | "dashboard"
  label: string
  dataset: string
  columns?: LineageColumn[]
}

export interface LineageColumn {
  name: string
  type: string
  description?: string
}

export interface LineageEdge {
  source: string
  target: string
  label?: string
  columns?: string[]
}

export interface EvalMetric {
  name: string
  value: number
  target: number
  unit: string
}

export interface TraceNode {
  id: string
  node_name: string
  agent_name?: string
  status: "pending" | "running" | "completed" | "failed" | "skipped"
  start_time: number
  end_time?: number
  duration_ms?: number
  input?: string
  output?: string
  error?: string
}

export interface QueryTrace {
  query_id: string
  original_query: string
  rewritten_query?: string
  query_type?: string
  selected_agents?: string[]
  nodes: TraceNode[]
  total_duration_ms: number
  total_cost_usd: number
  token_usage?: Record<string, number>
  hallucination_score?: number
  confidence_score?: number
  reflection_iterations?: number
}

export interface SourceDocument {
  id: string
  title: string
  source: string
  content: string
  metadata: Record<string, string>
  chunk_index: number
  total_chunks: number
  score: number
  retrieval_stage: "hybrid" | "reranked" | "compressed"
}

export interface SessionReplay {
  id: string
  session_id: string
  messages: ChatMessage[]
  trace?: QueryTrace
  checkpoint_key?: string
  created_at: number
}

export interface CircuitBreakerStatus {
  name: string
  state: "CLOSED" | "OPEN" | "HALF_OPEN"
  failure_threshold: number
  recovery_timeout_s: number
  current_failures: number
  last_failure?: number
}

export interface TokenUsage {
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
}

export interface ObservabilitySnapshot {
  total_queries: number
  total_cost_usd: number
  avg_latency_ms: number
  p95_latency_ms: number
  error_rate: number
  token_usage: TokenUsage[]
  circuit_breakers: CircuitBreakerStatus[]
  recent_errors: { node: string; error: string; timestamp: number }[]
  latency_by_node: { node: string; avg_ms: number; p95_ms: number; count: number }[]
  retry_counts: { node: string; attempts: number; success_rate: number }[]
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  citations?: Citation[]
  confidence_score?: number
  agent_results?: AgentResult[]
  retrieval_chunks?: RetrievalChunk[]
  timeline?: TimelineEvent[]
  trace?: QueryTrace
  latency_ms?: number
  cost_usd?: number
}

export interface Session {
  id: string
  title: string
  created_at: number
  message_count: number
  messages?: ChatMessage[]
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  created_at: number
}

export interface AuthResponse {
  user: User
  token: string
}

export type AppView =
  | "chat"
  | "retrieval"
  | "agents"
  | "lineage"
  | "evaluation"
  | "sessions"
  | "observability"
  | "documents"
