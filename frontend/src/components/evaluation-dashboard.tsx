"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import type { EvalMetric } from "@/lib/types"

const weeklyData = [
  { name: "Mon", relevancy: 0.87, hallucination: 0.04, latency: 1350 },
  { name: "Tue", relevancy: 0.91, hallucination: 0.03, latency: 1180 },
  { name: "Wed", relevancy: 0.88, hallucination: 0.05, latency: 1420 },
  { name: "Thu", relevancy: 0.93, hallucination: 0.02, latency: 1090 },
  { name: "Fri", relevancy: 0.89, hallucination: 0.03, latency: 1240 },
  { name: "Sat", relevancy: 0.92, hallucination: 0.03, latency: 1150 },
  { name: "Sun", relevancy: 0.90, hallucination: 0.04, latency: 1280 },
]

const agentLatencyData = [
  { name: "Docs", latency: 1450 },
  { name: "SQL", latency: 890 },
  { name: "Lineage", latency: 420 },
  { name: "Generator", latency: 2340 },
  { name: "Self-RAG", latency: 610 },
  { name: "Citation", latency: 180 },
]

const costData = [
  { name: "Week 1", cost: 0.042 },
  { name: "Week 2", cost: 0.038 },
  { name: "Week 3", cost: 0.045 },
  { name: "Week 4", cost: 0.035 },
]

function MetricCard({ metric }: { metric: EvalMetric }) {
  const pct = (metric.value / metric.target) * 100
  const isGood = metric.name.toLowerCase().includes("hallucination")
    ? metric.value <= metric.target
    : metric.value >= metric.target

  const meetsTarget = isGood

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs">{metric.name}</CardTitle>
          {meetsTarget ? (
            <TrendingUp className="size-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="size-3.5 text-destructive" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums">
            {metric.unit === "%" ? (metric.value * 100).toFixed(0) : metric.value.toFixed(metric.value < 1 ? 4 : 1)}
          </span>
          <span className="text-xs text-muted-foreground">{metric.unit}</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              meetsTarget ? "bg-emerald-500" : "bg-destructive"
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Target: {metric.unit === "%" ? (metric.target * 100).toFixed(0) : metric.target}{metric.unit}
        </p>
      </CardContent>
    </Card>
  )
}

export function EvaluationDashboard() {
  const evalMetrics = useStore((s) => s.evalMetrics)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Evaluation Dashboard</h2>
        <Badge variant="outline" className="text-[10px]">
          Last 7 days
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3">
            {evalMetrics.map((metric) => (
              <MetricCard key={metric.name} metric={metric} />
            ))}
          </div>

          <Tabs defaultValue="relevancy">
            <TabsList className="h-8">
              <TabsTrigger value="relevancy" className="text-xs">Relevancy</TabsTrigger>
              <TabsTrigger value="latency" className="text-xs">Latency</TabsTrigger>
              <TabsTrigger value="cost" className="text-xs">Cost</TabsTrigger>
              <TabsTrigger value="agents" className="text-xs">Agent Latency</TabsTrigger>
            </TabsList>

            <TabsContent value="relevancy" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Answer Relevancy & Hallucination Rate</CardTitle>
                  <CardDescription>Daily evaluation scores over the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData}>
                        <defs>
                          <linearGradient id="relevancyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="hallucinationGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} domain={[0, 1]} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="relevancy"
                          stroke="#3b82f6"
                          fill="url(#relevancyGrad)"
                          strokeWidth={2}
                          name="Relevancy"
                        />
                        <Area
                          type="monotone"
                          dataKey="hallucination"
                          stroke="#ef4444"
                          fill="url(#hallucinationGrad)"
                          strokeWidth={2}
                          name="Hallucination"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="latency" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">End-to-End Latency</CardTitle>
                  <CardDescription>P95 response time in milliseconds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} unit="ms" />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="latency" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cost" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Weekly API Cost</CardTitle>
                  <CardDescription>Total LLM token cost in USD</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={costData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} unit="$" />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="cost"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agents" className="mt-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs">Per-Agent Latency Breakdown</CardTitle>
                  <CardDescription>Average execution time per node</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentLatencyData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" tick={{ fontSize: 11 }} unit="ms" />
                        <YAxis dataKey="name" type="category" className="text-xs" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="latency" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
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
