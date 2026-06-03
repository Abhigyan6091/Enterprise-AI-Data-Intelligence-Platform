"use client"

import { X, CheckCircle2, XCircle, Loader2, SkipForward, Clock, DollarSign, Brain, FileText, ArrowRight, Network } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import type { TraceNode } from "@/lib/types"

const nodeColors: Record<string, string> = {
  query_rewriter: "border-l-blue-400",
  agent_router: "border-l-purple-400",
  docs_agent_node: "border-l-emerald-400",
  sql_agent_node: "border-l-amber-400",
  lineage_agent_node: "border-l-cyan-400",
  airflow_agent_node: "border-l-rose-400",
  code_agent_node: "border-l-indigo-400",
  merge_agents_node: "border-l-zinc-400",
  generator: "border-l-violet-400",
  self_rag: "border-l-orange-400",
  citation: "border-l-teal-400",
  evaluation: "border-l-slate-400",
}

function TraceNodeCard({ node }: { node: TraceNode }) {
  const border = nodeColors[node.node_name] ?? "border-l-muted"
  return (
    <div className={`border-l-2 pl-3 ${border} py-1`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium">{node.agent_name ?? node.node_name}</span>
          {node.status === "completed" && <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />}
          {node.status === "failed" && <XCircle className="size-3 text-destructive shrink-0" />}
          {node.status === "running" && <Loader2 className="size-3 animate-spin text-blue-500 shrink-0" />}
          {node.status === "skipped" && <SkipForward className="size-3 text-muted-foreground shrink-0" />}
          {node.status === "pending" && <div className="size-2.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
        </div>
        {node.duration_ms !== undefined && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{node.duration_ms}ms</span>
        )}
      </div>
      {node.input && (
        <div className="mt-1">
          <p className="text-[10px] text-muted-foreground/60 font-medium">Input:</p>
          <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 mt-0.5 font-mono line-clamp-2">{node.input}</p>
        </div>
      )}
      {node.output && (
        <div className="mt-1">
          <p className="text-[10px] text-muted-foreground/60 font-medium">Output:</p>
          <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 mt-0.5 font-mono line-clamp-2">{node.output}</p>
        </div>
      )}
      {node.error && (
        <div className="mt-1">
          <p className="text-[10px] text-destructive font-medium">Error:</p>
          <p className="text-[10px] text-destructive bg-destructive/5 rounded px-1.5 py-0.5 mt-0.5 font-mono">{node.error}</p>
        </div>
      )}
    </div>
  )
}

export function QueryTraceDrawer() {
  const open = useStore((s) => s.traceDrawerOpen)
  const close = useStore((s) => s.closeTraceDrawer)
  const trace = useStore((s) => s.activeTrace)

  if (!open || !trace) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={close} />
      <div className="relative w-[420px] max-w-[90vw] bg-background border-l shadow-xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between border-b px-4 h-12">
          <div className="flex items-center gap-2">
            <Brain className="size-4" />
            <span className="text-sm font-medium">Query Trace</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={close}>
            <X className="size-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-3rem)]">
          <div className="p-4 space-y-4">
            <Card className="p-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">Original Query</p>
              <p className="text-sm">{trace.original_query}</p>
              {trace.rewritten_query && (
                <>
                  <p className="text-xs text-muted-foreground font-medium mt-2 mb-1">Rewritten Query</p>
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 font-mono">{trace.rewritten_query}</p>
                </>
              )}
            </Card>

            <div className="flex items-center gap-3">
              {trace.query_type && (
                <Badge variant="outline" className="text-[10px]">{trace.query_type}</Badge>
              )}
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-3" />
                {trace.total_duration_ms}ms
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <DollarSign className="size-3" />
                ${trace.total_cost_usd.toFixed(4)}
              </span>
              {trace.confidence_score !== undefined && (
                <span className="text-[10px] text-muted-foreground">
                  Confidence: {(trace.confidence_score * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {trace.selected_agents && trace.selected_agents.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Selected Agents</p>
                <div className="flex flex-wrap gap-1">
                  {trace.selected_agents.map((agent) => (
                    <Badge key={agent} variant="secondary" className="text-[10px]">{agent}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Pipeline ({trace.nodes.length} nodes)
              </p>
              <div className="space-y-3">
                {trace.nodes.map((node, i) => (
                  <div key={node.id}>
                    <TraceNodeCard node={node} />
                    {i < trace.nodes.length - 1 && (
                      <div className="ml-[5px] pl-3 mt-1">
                        <ArrowRight className="size-3 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {trace.token_usage && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Token Usage</p>
                  <div className="space-y-1">
                    {Object.entries(trace.token_usage).map(([model, tokens]) => (
                      <div key={model} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{model}</span>
                        <span className="text-muted-foreground tabular-nums">{tokens.toLocaleString()} tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {trace.reflection_iterations !== undefined && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-xs">
                  <Network className="size-3" />
                  <span className="text-muted-foreground">Reflection iterations: {trace.reflection_iterations}</span>
                </div>
              </>
            )}

            {trace.hallucination_score !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <FileText className="size-3" />
                <span className="text-muted-foreground">Hallucination score: {(trace.hallucination_score * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
