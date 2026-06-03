"use client"

import { FileText, Search, ExternalLink, BookOpen, SlidersHorizontal, ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import type { SourceDocument } from "@/lib/types"

const mockDocs: SourceDocument[] = [
  {
    id: "doc-1",
    title: "Users Table Schema",
    source: "schema_docs/users.md",
    content: `## Users Table

The \`users\` table stores all registered user profiles and authentication data.

### Columns
- \`id\` (UUID, PK): Unique user identifier
- \`email\` (VARCHAR(255)): User email address (unique)
- \`name\` (VARCHAR(100)): Display name
- \`created_at\` (TIMESTAMP): Account creation time
- \`last_login\` (TIMESTAMP): Most recent authentication
- \`status\` (ENUM: 'active', 'suspended', 'deleted'): Account state
- \`plan_tier\` (ENUM: 'free', 'pro', 'enterprise'): Subscription level

### Indexes
- Primary: \`id\`
- Unique: \`email\`
- Secondary: \`created_at\`, \`status\`

### Relationships
- \`sessions.user_id\` → \`users.id\`
- \`transactions.user_id\` → \`users.id\``,
    metadata: { source: "schema_docs/users.md", table: "users", database: "postgres" },
    chunk_index: 0,
    total_chunks: 2,
    score: 0.94,
    retrieval_stage: "reranked",
  },
  {
    id: "doc-2",
    title: "Retention Definition",
    source: "analytics/definitions.md",
    content: `## User Retention (30-Day)

Retention measures the percentage of users who return to the platform within a specified window after their first engagement.

### Definition
\`\`\`
D30 Retention = Users active on Day 30 / Users who signed up on Day 0
\`\`\`

### Calculation
The retention metric is computed daily by the \`retention\` dbt model in the \`marts\` schema. The model:
1. Identifies new users per cohort date
2. Tracks user activity across 7, 14, and 30-day windows
3. Computes rolling retention curves segmented by acquisition channel

### Data Sources
- \`source.postgres.users\` → signup dates
- \`analytics.active_users\` → daily activity`,
    metadata: { source: "analytics/definitions.md", model: "retention", domain: "analytics" },
    chunk_index: 0,
    total_chunks: 1,
    score: 0.89,
    retrieval_stage: "reranked",
  },
  {
    id: "doc-3",
    title: "Daily Active Users Query",
    source: "sql/analytics/daily_active_users.sql",
    content: `-- daily_active_users.sql
-- Purpose: Compute daily active user counts segmented by plan tier

WITH daily_activity AS (
  SELECT
    date_trunc('day', s.created_at) AS day,
    u.plan_tier,
    COUNT(DISTINCT s.user_id) AS active_users
  FROM sessions s
  JOIN users u ON s.user_id = u.id
  WHERE s.created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY 1, 2
)
SELECT
  day,
  plan_tier,
  active_users,
  SUM(active_users) OVER (PARTITION BY plan_tier ORDER BY day) AS cumulative
FROM daily_activity
ORDER BY day DESC, plan_tier;`,
    metadata: { source: "sql/analytics/daily_active_users.sql", type: "query" },
    chunk_index: 0,
    total_chunks: 1,
    score: 0.82,
    retrieval_stage: "hybrid",
  },
  {
    id: "doc-4",
    title: "Retention Dashboard Config",
    source: "dashboards/retention.json",
    content: `{
  "dashboard": "User Retention",
  "panels": [
    { "title": "30-Day Retention Curve", "type": "graph", "target": "select * from marts.retention.weekly" },
    { "title": "Cohort Analysis", "type": "heatmap", "target": "weekly_cohorts" },
    { "title": "Segment Breakdown", "type": "bar", "target": "retention_by_channel" }
  ],
  "refresh": "6h",
  "time_range": "last_30_days"
}`,
    metadata: { source: "dashboards/retention.json", dashboard: "User Retention" },
    chunk_index: 0,
    total_chunks: 1,
    score: 0.76,
    retrieval_stage: "reranked",
  },
  {
    id: "doc-5",
    title: "Retention Compute DAG",
    source: "airflow/dags/retention_compute.py",
    content: `"""Retention Compute DAG

Runs daily at 02:00 UTC to compute retention metrics.
"""

from airflow import DAG
from airflow.operators.postgres import PostgresOperator

with DAG(
    dag_id="retention_compute",
    schedule="0 2 * * *",
    catchup=False,
) as dag:
    compute_retention = PostgresOperator(
        task_id="compute_retention",
        sql="CALL marts.compute_retention_metrics()",
        postgres_conn_id="analytics_db",
    )

    write_results = PostgresOperator(
        task_id="write_to_marts",
        sql="INSERT INTO marts.retention.weekly SELECT * FROM temp_retention",
        postgres_conn_id="analytics_db",
    )

    compute_retention >> write_results`,
    metadata: { source: "airflow/dags/retention_compute.py", dag_id: "retention_compute" },
    chunk_index: 0,
    total_chunks: 1,
    score: 0.71,
    retrieval_stage: "hybrid",
  },
]

const stageIcons = {
  hybrid: { icon: Search, label: "Hybrid Search" },
  reranked: { icon: ArrowUpDown, label: "Cross-Encoder Reranked" },
  compressed: { icon: SlidersHorizontal, label: "Context Compressed" },
}

function DocumentCard({ doc }: { doc: SourceDocument }) {
  const setActiveDocument = useStore((s) => s.setActiveDocument)
  const activeDocument = useStore((s) => s.activeDocument)
  const isActive = activeDocument?.id === doc.id
  const stage = stageIcons[doc.retrieval_stage]

  return (
    <Card
      className={`cursor-pointer transition-colors ${isActive ? "ring-1 ring-primary" : ""}`}
      onClick={() => setActiveDocument(doc)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
            <FileText className="size-3" />
            {doc.title}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {(doc.score * 100).toFixed(0)}%
          </Badge>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <stage.icon className="size-2.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{stage.label}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground line-clamp-3 font-mono text-[10px] leading-relaxed">
          {doc.content.slice(0, 240)}
          {doc.content.length > 240 ? "..." : ""}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {Object.entries(doc.metadata).map(([key, val]) => (
            <Badge key={key} variant="outline" className="text-[10px]">
              {key}: {val}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          <span>Chunk {doc.chunk_index + 1}/{doc.total_chunks}</span>
          <span>·</span>
          <ExternalLink className="size-2.5" />
          <span className="truncate">{doc.source}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SourceDocumentViewer() {
  const activeDocument = useStore((s) => s.activeDocument)
  const sourceDocuments = useStore((s) => s.sourceDocuments)
  const docs = sourceDocuments.length > 0 ? sourceDocuments : mockDocs

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Source Document Viewer</h2>
        <Badge variant="outline" className="text-[10px]">{docs.length} documents</Badge>
      </div>

      <div className="flex flex-1 min-h-0">
        <ScrollArea className="w-80 border-r shrink-0 p-3">
          <div className="space-y-2">
            <Tabs defaultValue="all" className="mb-2">
              <TabsList className="h-7">
                <TabsTrigger value="all" className="text-[10px] px-2">All</TabsTrigger>
                <TabsTrigger value="reranked" className="text-[10px] px-2">Reranked</TabsTrigger>
                <TabsTrigger value="hybrid" className="text-[10px] px-2">Hybrid</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-2 space-y-2">
                {docs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </TabsContent>
              <TabsContent value="reranked" className="mt-2 space-y-2">
                {docs.filter((d) => d.retrieval_stage === "reranked").map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </TabsContent>
              <TabsContent value="hybrid" className="mt-2 space-y-2">
                {docs.filter((d) => d.retrieval_stage === "hybrid").map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <div className="flex-1 flex flex-col min-w-0">
          {activeDocument ? (
            <>
              <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="size-4" />
                  <span className="text-sm font-medium">{activeDocument.title}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{activeDocument.source}</Badge>
              </div>
              <ScrollArea className="flex-1 p-4">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground/80">
                  {activeDocument.content}
                </pre>
                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Metadata</p>
                  {Object.entries(activeDocument.metadata).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="font-mono w-24 shrink-0">{k}:</span>
                      <span>{v}</span>
                    </div>
                  ))}
                  <p className="mt-2">
                    Retrieval stage: <Badge variant="secondary" className="text-[10px]">{activeDocument.retrieval_stage}</Badge>
                  </p>
                  <p>Relevance score: {(activeDocument.score * 100).toFixed(0)}%</p>
                  <p>Chunk {activeDocument.chunk_index + 1} of {activeDocument.total_chunks}</p>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <BookOpen className="mx-auto size-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">Select a source document to view</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Retrieved via hybrid search + cross-encoder reranking
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
