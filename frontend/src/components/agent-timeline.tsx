"use client"

import { CheckCircle2, XCircle, Loader2, ArrowRight, Network } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TimelineEvent } from "@/lib/types"

const mockTimeline: TimelineEvent[] = [
  { node: "query_rewriter", status: "completed", started_at: 0, duration_ms: 320, agent_name: "Rewriter" },
  { node: "agent_router", status: "completed", started_at: 320, duration_ms: 210, agent_name: "Router" },
  { node: "docs_agent_node", status: "completed", started_at: 530, duration_ms: 1450, agent_name: "DocumentationAgent" },
  { node: "sql_agent_node", status: "completed", started_at: 530, duration_ms: 890, agent_name: "SQLAgent" },
  { node: "lineage_agent_node", status: "completed", started_at: 530, duration_ms: 420, agent_name: "LineageAgent" },
  { node: "airflow_agent_node", status: "skipped", started_at: 530, duration_ms: 0, agent_name: "AirflowAgent" },
  { node: "code_agent_node", status: "skipped", started_at: 530, duration_ms: 0, agent_name: "CodeAgent" },
  { node: "merge_agents_node", status: "completed", started_at: 1980, duration_ms: 45, agent_name: "Merge" },
  { node: "generator", status: "completed", started_at: 2025, duration_ms: 2340, agent_name: "Generator" },
  { node: "self_rag", status: "completed", started_at: 4365, duration_ms: 610, agent_name: "Self-RAG" },
  { node: "citation", status: "completed", started_at: 4975, duration_ms: 180, agent_name: "Citation" },
  { node: "evaluation", status: "completed", started_at: 5155, duration_ms: 90, agent_name: "Evaluation" },
]

const totalDuration = mockTimeline.reduce((max, e) => Math.max(max, e.started_at + e.duration_ms), 0)

function AgentIcon({ name }: { name?: string }) {
  if (!name) return <div className="size-2 rounded-full bg-muted" />
  const colorMap: Record<string, string> = {
    Rewriter: "bg-blue-400",
    Router: "bg-purple-400",
    DocumentationAgent: "bg-emerald-400",
    SQLAgent: "bg-amber-400",
    LineageAgent: "bg-cyan-400",
    AirflowAgent: "bg-rose-400",
    CodeAgent: "bg-indigo-400",
    Merge: "bg-zinc-400",
    Generator: "bg-violet-400",
    "Self-RAG": "bg-orange-400",
    Citation: "bg-teal-400",
    Evaluation: "bg-slate-400",
  }
  return <div className={`size-2 rounded-full ${colorMap[name] ?? "bg-muted"}`} />
}

export function AgentTimeline() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Agent Execution Timeline</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {totalDuration}ms total
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {mockTimeline.length} nodes
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {mockTimeline.map((event, i) => {
            const widthPct = event.duration_ms > 0 ? (event.duration_ms / totalDuration) * 100 : 0
            const startPct = (event.started_at / totalDuration) * 100

            return (
              <div key={i} className="group">
                <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                  <AgentIcon name={event.agent_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{event.agent_name ?? event.node}</span>
                      {event.status === "completed" && (
                        <CheckCircle2 className="size-3 text-emerald-500" />
                      )}
                      {event.status === "failed" && (
                        <XCircle className="size-3 text-destructive" />
                      )}
                      {event.status === "running" && (
                        <Loader2 className="size-3 animate-spin text-blue-500" />
                      )}
                      {event.status === "skipped" && (
                        <Badge variant="secondary" className="text-[10px] leading-none py-0">
                          skipped
                        </Badge>
                      )}
                    </div>
                    {event.duration_ms > 0 && (
                      <div className="mt-1 relative h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="absolute inset-y-0 rounded-full bg-primary/60 transition-all"
                          style={{
                            left: `${startPct}%`,
                            width: `${Math.max(widthPct, 1)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {event.duration_ms > 0 ? `${event.duration_ms}ms` : "-"}
                  </span>
                </div>

                {/* Show parallel agent fan-out */}
                {event.node === "agent_router" && (
                  <div className="ml-5 pl-3 border-l-2 border-muted mb-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                      <Network className="size-3" />
                      <span>Parallel fan-out to 6 agents</span>
                    </div>
                  </div>
                )}

                {/* Show merge after parallel agents */}
                {event.node === "merge_agents_node" && (
                  <div className="ml-5 pl-3 border-l-2 border-muted mb-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                      <ArrowRight className="size-3" />
                      <span>Fan-in merge of agent outputs</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
