"use client"

import { FileText, SlidersHorizontal, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import type { RetrievalChunk } from "@/lib/types"

const mockChunks: RetrievalChunk[] = [
  {
    content: "The users table contains all registered user profiles with columns: id, email, name, created_at, last_login, status, plan_tier.",
    metadata: { source: "schema_docs/users.md", table: "users" },
    score: 0.94,
    source: "DocumentationAgent",
  },
  {
    content: "User retention is calculated as the percentage of users who return within 30 days of their first visit. The KPI is computed daily via the `retention` dbt model.",
    metadata: { source: "analytics/definitions.md", model: "retention" },
    score: 0.89,
    source: "DocumentationAgent",
  },
  {
    content: "SELECT date_trunc('day', created_at) as day, COUNT(DISTINCT user_id) as active_users FROM sessions GROUP BY 1 ORDER BY 1",
    metadata: { source: "sql/analytics/daily_active_users.sql" },
    score: 0.82,
    source: "SQLAgent",
  },
  {
    content: "The user_retention dashboard shows the 30-day rolling retention curve segmented by acquisition channel. Updated every 6 hours.",
    metadata: { source: "dashboards/retention.json" },
    score: 0.76,
    source: "DocumentationAgent",
  },
  {
    content: "The nightly DAG `retention_compute` runs at 02:00 UTC and writes to `marts.retention.weekly`. Average run time: 4m32s. Last status: success.",
    metadata: { source: "airflow/dags/retention_compute.py" },
    score: 0.71,
    source: "AirflowAgent",
  },
]

export function RetrievalInspector() {
  const messages = useStore((s) => s.messages)

  const latestResponse = [...messages].reverse().find((m) => m.role === "assistant" && m.content)
  const chunks = latestResponse?.retrieval_chunks ?? mockChunks

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Retrieval Inspector</h2>
        <Badge variant="outline" className="text-[10px]">
          {chunks.length} chunks
        </Badge>
      </div>

      <Tabs defaultValue="chunks" className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-8">
            <TabsTrigger value="chunks" className="text-xs">Chunks</TabsTrigger>
            <TabsTrigger value="ranks" className="text-xs">Ranking</TabsTrigger>
            <TabsTrigger value="compression" className="text-xs">Compression</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chunks" className="flex-1 p-0 mt-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-3">
              {chunks.map((chunk, i) => (
                <Card key={i} className="border-l-2 border-l-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
                        <FileText className="size-3" />
                        {chunk.source}
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px]">
                        {(chunk.score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">{chunk.content}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(chunk.metadata).map(([key, val]) => (
                        <Badge key={key} variant="outline" className="text-[10px]">
                          {key}: {val}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ranks" className="flex-1 p-0 mt-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <ArrowUpDown className="size-3" />
                <span>Sorted by cross-encoder relevance score (descending)</span>
              </div>
              {chunks.map((chunk, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border p-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{chunk.content}</p>
                    <p className="text-[10px] text-muted-foreground">{chunk.source}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-1.5 w-12 rounded-full bg-muted overflow-hidden"
                      title={`Score: ${chunk.score}`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${chunk.score * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {(chunk.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="compression" className="flex-1 p-0 mt-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <SlidersHorizontal className="mx-auto size-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">Context Compression</p>
              <p className="text-xs text-muted-foreground/60">
                Compressed {chunks.length} chunks into ~2.4K tokens for generation
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
