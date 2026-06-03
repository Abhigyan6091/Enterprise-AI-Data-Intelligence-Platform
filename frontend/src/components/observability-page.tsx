"use client"

import { Zap, AlertTriangle, CircleOff, RotateCcw, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

const circuitBreakers: { name: string; state: "CLOSED" | "OPEN" | "HALF_OPEN"; threshold: number; recovery: number; failures: number }[] = [
  { name: "ollama_breaker", state: "CLOSED", threshold: 3, recovery: 45, failures: 0 },
  { name: "qdrant_breaker", state: "CLOSED", threshold: 5, recovery: 20, failures: 1 },
]

const tokenUsage = [
  { model: "llama3", prompt: 12450, completion: 3200, total: 15650, cost: 0.0032 },
  { model: "bge-reranker-large", prompt: 8900, completion: 0, total: 8900, cost: 0.0018 },
  { model: "bge-large-en-v1.5", prompt: 0, completion: 0, total: 0, cost: 0.0 },
]

const latencyByNode = [
  { node: "generator", avg: 2340, p95: 3100, count: 142 },
  { node: "docs_agent_node", avg: 1450, p95: 2100, count: 142 },
  { node: "sql_agent_node", avg: 890, p95: 1500, count: 86 },
  { node: "self_rag", avg: 610, p95: 950, count: 142 },
  { node: "lineage_agent_node", avg: 420, p95: 680, count: 34 },
  { node: "query_rewriter", avg: 320, p95: 510, count: 142 },
  { node: "agent_router", avg: 210, p95: 380, count: 142 },
  { node: "citation", avg: 180, p95: 290, count: 142 },
  { node: "evaluation", avg: 90, p95: 140, count: 142 },
]

const retryStats = [
  { node: "docs_agent_node", attempts: 4, success: 3, fail: 1 },
  { node: "generator", attempts: 3, success: 3, fail: 0 },
  { node: "sql_agent_node", attempts: 2, success: 2, fail: 0 },
]

const recentErrors = [
  { node: "docs_agent_node", error: "Connection refused: Qdrant port 6333", timestamp: Date.now() - 300000 },
  { node: "generator", error: "LLM timeout after 120s, retry 2/4", timestamp: Date.now() - 1800000 },
]

function MetricTile({ label, value, unit, trend }: { label: string; value: string; unit: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl font-semibold tabular-nums">{value}</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
          {trend === "up" && <TrendingUp className="size-3 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="size-3 text-destructive" />}
        </div>
      </CardContent>
    </Card>
  )
}

function CircuitBreakerCard({ cb }: { cb: typeof circuitBreakers[0] }) {
  const isOpen = cb.state === "OPEN"
  const isHalfOpen = cb.state === "HALF_OPEN"
  return (
    <Card className={`border-l-2 ${isOpen ? "border-l-destructive" : isHalfOpen ? "border-l-amber-500" : "border-l-emerald-500"}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOpen ? <CircleOff className="size-3 text-destructive" /> : isHalfOpen ? <AlertTriangle className="size-3 text-amber-500" /> : <Zap className="size-3 text-emerald-500" />}
            <span className="text-xs font-mono font-medium">{cb.name}</span>
          </div>
          <Badge variant={isOpen ? "destructive" : isHalfOpen ? "warning" : "success"} className="text-[10px]">
            {cb.state}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
          <span>Threshold: {cb.threshold}</span>
          <span>Failures: {cb.failures}</span>
          <span>Recovery: {cb.recovery}s</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ObservabilityPage() {
  const totalLatency = latencyByNode.reduce((s, n) => s + n.avg, 0)
  const totalCost = tokenUsage.reduce((s, t) => s + t.cost, 0)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Observability</h2>
        <Badge variant="outline" className="text-[10px]">Live</Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-5 gap-3">
            <MetricTile label="Total Queries" value="142" unit="today" trend="up" />
            <MetricTile label="Avg Latency" value={`${totalLatency}ms`} unit="pipeline" trend="down" />
            <MetricTile label="Total Cost" value={`$${totalCost.toFixed(4)}`} unit="today" />
            <MetricTile label="Error Rate" value="1.4%" unit="last 24h" trend="down" />
            <MetricTile label="P95 Latency" value="4.8s" unit="end-to-end" trend="down" />
          </div>

          <Tabs defaultValue="circuit-breakers">
            <TabsList className="h-8">
              <TabsTrigger value="circuit-breakers" className="text-xs">Circuit Breakers</TabsTrigger>
              <TabsTrigger value="latency" className="text-xs">Latency</TabsTrigger>
              <TabsTrigger value="tokens" className="text-xs">Token Usage</TabsTrigger>
              <TabsTrigger value="retries" className="text-xs">Retries</TabsTrigger>
              <TabsTrigger value="errors" className="text-xs">Recent Errors</TabsTrigger>
            </TabsList>

            <TabsContent value="circuit-breakers" className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Circuit breakers protect the system by halting requests to failing services
              </p>
              {circuitBreakers.map((cb) => (
                <CircuitBreakerCard key={cb.name} cb={cb} />
              ))}
            </TabsContent>

            <TabsContent value="latency" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Per-Node Latency</CardTitle>
                  <CardDescription>Average and P95 execution time per pipeline node</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {latencyByNode.map((node) => {
                      const maxLatency = Math.max(...latencyByNode.map((n) => n.p95))
                      return (
                        <div key={node.node}>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="font-mono">{node.node}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{node.count}x</span>
                              <span className="tabular-nums w-14 text-right">{node.avg}ms</span>
                              <span className="tabular-nums w-14 text-right text-muted-foreground">p95 {node.p95}ms</span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/60"
                              style={{ width: `${(node.p95 / maxLatency) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tokens" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Token Usage by Model</CardTitle>
                  <CardDescription>Prompt and completion tokens per model endpoint</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tokenUsage.map((t) => (
                      <div key={t.model}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium">{t.model}</span>
                          <span className="text-muted-foreground">${t.cost.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>Prompt: {t.prompt.toLocaleString()}</span>
                          <span>Completion: {t.completion.toLocaleString()}</span>
                          <span>Total: {t.total.toLocaleString()}</span>
                        </div>
                        {t.total > 0 && (
                          <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(t.prompt / t.total) * 100}%` }} />
                          </div>
                        )}
                        <Separator className="mt-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retries" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Retry Attempts</CardTitle>
                  <CardDescription>Nodes with exponential backoff retry logic</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {retryStats.map((r) => (
                      <div key={r.node} className="flex items-center gap-3">
                        <RotateCcw className="size-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono">{r.node}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{r.attempts} attempts max</span>
                            <span className="text-emerald-500">{r.success} success</span>
                            {r.fail > 0 && <span className="text-destructive">{r.fail} failed</span>}
                          </div>
                        </div>
                        <Badge variant={r.fail > 0 ? "warning" : "success"} className="text-[10px]">
                          {(r.success / r.attempts * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Recent Errors</CardTitle>
                  <CardDescription>Last 24 hours of pipeline failures</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentErrors.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No recent errors</p>
                    ) : (
                      recentErrors.map((e, i) => (
                        <div key={i} className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
                          <div className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="size-3 text-destructive shrink-0" />
                            <span className="font-mono text-destructive font-medium">{e.node}</span>
                          </div>
                          <p className="text-[10px] text-destructive/80 mt-0.5 font-mono">{e.error}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(e.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
