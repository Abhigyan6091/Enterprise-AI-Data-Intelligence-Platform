"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, ChevronRight, FileText, AlertCircle, Clock, DollarSign, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useStore } from "@/lib/store"
import type { ChatMessage, Citation, QueryTrace, TraceNode } from "@/lib/types"

function CitationCard({ citation }: { citation: Citation }) {
  return (
    <Card className="mb-2 p-3 text-xs">
      <p className="mb-1 text-muted-foreground line-clamp-2">{citation.text}</p>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {citation.metadata.source ?? "unknown"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {(citation.relevance_score * 100).toFixed(0)}%
        </span>
      </div>
    </Card>
  )
}

function buildMockTrace(query: string): QueryTrace {
  const now = Date.now()
  const nodes: TraceNode[] = [
    { id: "n1", node_name: "query_rewriter", agent_name: "Rewriter", status: "completed", start_time: now - 5000, end_time: now - 4680, duration_ms: 320, input: query, output: `Optimized: ${query} focusing on retention metrics` },
    { id: "n2", node_name: "agent_router", agent_name: "Router", status: "completed", start_time: now - 4680, end_time: now - 4470, duration_ms: 210, input: "Classify query type", output: "multi_faceted: docs, sql, lineage" },
    { id: "n3", node_name: "docs_agent_node", agent_name: "DocumentationAgent", status: "completed", start_time: now - 4470, end_time: now - 3020, duration_ms: 1450, input: "Search enterprise knowledge base", output: "Found 3 relevant documentation pages" },
    { id: "n4", node_name: "sql_agent_node", agent_name: "SQLAgent", status: "completed", start_time: now - 4470, end_time: now - 3580, duration_ms: 890, input: "SELECT * FROM marts.retention", output: "Retrieved 12 rows from retention model" },
    { id: "n5", node_name: "lineage_agent_node", agent_name: "LineageAgent", status: "completed", start_time: now - 4470, end_time: now - 4050, duration_ms: 420, input: "Trace users -> retention pipeline", output: "Found lineage path: users -> stg_users -> dim_users -> fct_retention" },
    { id: "n6", node_name: "merge_agents_node", agent_name: "Merge", status: "completed", start_time: now - 3020, end_time: now - 2975, duration_ms: 45, input: "3 agent outputs + 5 chunks", output: "Compressed context: 2.4K tokens" },
    { id: "n7", node_name: "generator", agent_name: "Generator", status: "completed", start_time: now - 2975, end_time: now - 635, duration_ms: 2340, input: "Synthesize answer from context", output: "Generated response with retention metrics" },
    { id: "n8", node_name: "self_rag", agent_name: "Self-RAG", status: "completed", start_time: now - 635, end_time: now - 25, duration_ms: 610, input: "Evaluate for hallucination", output: "Score: 0.08 (below threshold)" },
    { id: "n9", node_name: "citation", agent_name: "Citation", status: "completed", start_time: now - 25, end_time: now, duration_ms: 180, input: "Map claims to sources", output: "Generated 3 citations" },
    { id: "n10", node_name: "evaluation", agent_name: "Evaluation", status: "completed", start_time: now, end_time: now + 90, duration_ms: 90, input: "Aggregate metrics", output: "Confidence: 0.92, Cost: $0.0082" },
  ]
  return {
    query_id: `trace-${Date.now()}`,
    original_query: query,
    rewritten_query: `Optimized: ${query} focusing on retention metrics`,
    query_type: "multi_faceted",
    selected_agents: ["DocumentationAgent", "SQLAgent", "LineageAgent"],
    nodes,
    total_duration_ms: nodes.reduce((s, n) => Math.max(s, (n.end_time ?? 0) - (n.start_time)), 0),
    total_cost_usd: 0.0082,
    token_usage: { llama3: 15650, "bge-reranker-large": 8900 },
    confidence_score: 0.92,
    hallucination_score: 0.08,
    reflection_iterations: 0,
  }
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  const openTraceDrawer = useStore((s) => s.openTraceDrawer)

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "order-1" : "order-1"}`}>
        <div
          className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {message.content}
        </div>

        {!isUser && (
          <div className="mt-1.5 flex items-center gap-2 px-1 flex-wrap">
            {message.confidence_score !== undefined && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <AlertCircle className="size-3" />
                {(message.confidence_score * 100).toFixed(0)}% confidence
              </span>
            )}
            {message.latency_ms !== undefined && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-3" />
                {message.latency_ms.toFixed(0)}ms
              </span>
            )}
            {message.cost_usd !== undefined && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <DollarSign className="size-3" />
                ${message.cost_usd.toFixed(4)}
              </span>
            )}
            <button
              onClick={() => {
                const trace = message.trace ?? buildMockTrace(
                  useStore.getState().messages.find((m) => m.id < message.id)?.content ?? "unknown query"
                )
                openTraceDrawer(trace)
              }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <GitBranch className="size-3" />
              View Trace
            </button>
          </div>
        )}

        {!isUser && message.citations && message.citations.length > 0 && (
          <Collapsible className="mt-2">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="size-3 data-[state=open]:rotate-90 transition-transform" />
              <FileText className="size-3" />
              {message.citations.length} citations
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {message.citations.map((c, i) => (
                <CitationCard key={i} citation={c} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}

export function ChatWorkspace() {
  const [input, setInput] = useState("")
  const messages = useStore((s) => s.messages)
  const addMessage = useStore((s) => s.addMessage)
  const updateMessage = useStore((s) => s.updateMessage)
  const isProcessing = useStore((s) => s.isProcessing)
  const setIsProcessing = useStore((s) => s.setIsProcessing)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    }
    addMessage(userMsg)
    setInput("")
    setIsProcessing(true)

    const assistantId = `msg-${Date.now()}-resp`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    }
    addMessage(assistantMsg)

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMsg.content,
          session_id: useStore.getState().activeSessionId || "default",
        }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const data = await res.json()
      updateMessage(assistantId, {
        content: data.final_answer,
        citations: data.citations,
        confidence_score: data.confidence_score,
        latency_ms: data.latency_ms,
        cost_usd: data.total_cost_usd,
        trace: buildMockTrace(userMsg.content),
      })
    } catch {
      updateMessage(assistantId, {
        content: "Sorry, I encountered an error processing your request. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Chat</h2>
        <Badge variant="outline" className="text-[10px]">
          {messages.length} messages
        </Badge>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground">
                Ask a question about your data platform
              </h3>
              <p className="mt-1 text-xs text-muted-foreground/60">
                The agent will route your query to the appropriate tool and synthesize results.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data pipelines, tables, or metrics..."
            disabled={isProcessing}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isProcessing || !input.trim()}>
            {isProcessing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
