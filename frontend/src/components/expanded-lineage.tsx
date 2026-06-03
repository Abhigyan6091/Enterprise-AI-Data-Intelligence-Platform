"use client"

import { useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Database, Table, BarChart3, Columns, ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { LineageColumn } from "@/lib/types"

const initialNodes: Node[] = [
  {
    id: "source-postgres-users",
    type: "sourceNode",
    position: { x: 80, y: 0 },
    data: {
      label: "users",
      type: "source",
      dataset: "postgres.public",
      columns: [
        { name: "id", type: "UUID PK", description: "Unique user identifier" },
        { name: "email", type: "VARCHAR(255)", description: "User email" },
        { name: "name", type: "VARCHAR(100)", description: "Display name" },
        { name: "created_at", type: "TIMESTAMP", description: "Signup date" },
        { name: "status", type: "ENUM", description: "active/suspended/deleted" },
        { name: "plan_tier", type: "ENUM", description: "free/pro/enterprise" },
      ],
    },
  },
  {
    id: "source-postgres-transactions",
    type: "sourceNode",
    position: { x: 520, y: 0 },
    data: {
      label: "transactions",
      type: "source",
      dataset: "postgres.public",
      columns: [
        { name: "id", type: "UUID PK", description: "Transaction ID" },
        { name: "user_id", type: "UUID FK", description: "References users.id" },
        { name: "amount", type: "DECIMAL(10,2)", description: "Transaction amount" },
        { name: "currency", type: "VARCHAR(3)", description: "USD/EUR/GBP" },
        { name: "payment_method", type: "VARCHAR(20)", description: "card/wire/crypto" },
        { name: "created_at", type: "TIMESTAMP", description: "Transaction time" },
      ],
    },
  },
  {
    id: "source-kafka-events",
    type: "sourceNode",
    position: { x: 960, y: 0 },
    data: {
      label: "user_events",
      type: "source",
      dataset: "kafka.analytics",
      columns: [
        { name: "event_id", type: "UUID", description: "Event identifier" },
        { name: "user_id", type: "UUID", description: "User who triggered event" },
        { name: "event_type", type: "VARCHAR(50)", description: "page_view/click/login" },
        { name: "properties", type: "JSONB", description: "Event payload" },
        { name: "timestamp", type: "TIMESTAMP", description: "Event time" },
      ],
    },
  },
  {
    id: "transform-stage-users",
    type: "transformNode",
    position: { x: 80, y: 220 },
    data: {
      label: "stg_users",
      type: "transform",
      dataset: "stage",
      columns: [
        { name: "user_id", type: "UUID", description: "Cleaned user ID" },
        { name: "email", type: "VARCHAR(255)", description: "Lowercased email" },
        { name: "full_name", type: "VARCHAR(100)", description: "Trimmed display name" },
        { name: "signup_date", type: "DATE", description: "Cast from created_at" },
        { name: "account_status", type: "VARCHAR(20)", description: "Normalized status" },
      ],
    },
  },
  {
    id: "transform-stage-payments",
    type: "transformNode",
    position: { x: 520, y: 220 },
    data: {
      label: "stg_payments",
      type: "transform",
      dataset: "stage",
      columns: [
        { name: "payment_id", type: "UUID", description: "Cleaned transaction ID" },
        { name: "user_id", type: "UUID", description: "FK to dim_users" },
        { name: "amount_usd", type: "DECIMAL(10,2)", description: "Amount converted to USD" },
        { name: "payment_method", type: "VARCHAR(20)", description: "Normalized method" },
        { name: "payment_date", type: "DATE", description: "Transaction date" },
      ],
    },
  },
  {
    id: "transform-stage-events",
    type: "transformNode",
    position: { x: 960, y: 220 },
    data: {
      label: "stg_events",
      type: "transform",
      dataset: "stage",
      columns: [
        { name: "event_id", type: "UUID", description: "Deduplicated event ID" },
        { name: "user_id", type: "UUID", description: "FK to dim_users" },
        { name: "event_category", type: "VARCHAR(20)", description: "Bucketed event type" },
        { name: "event_date", type: "DATE", description: "Event date" },
      ],
    },
  },
  {
    id: "transform-marts-users",
    type: "transformNode",
    position: { x: 80, y: 440 },
    data: {
      label: "dim_users",
      type: "transform",
      dataset: "marts",
      columns: [
        { name: "user_id", type: "UUID PK", description: "Surrogate key" },
        { name: "email", type: "VARCHAR(255)", description: "Current email" },
        { name: "full_name", type: "VARCHAR(100)", description: "Current name" },
        { name: "signup_date", type: "DATE", description: "Original signup" },
        { name: "account_status", type: "VARCHAR(20)", description: "Current status" },
        { name: "plan_tier", type: "VARCHAR(20)", description: "Current plan" },
        { name: "ltv_segment", type: "VARCHAR(20)", description: "CLV-based segment" },
      ],
    },
  },
  {
    id: "transform-marts-revenue",
    type: "transformNode",
    position: { x: 520, y: 440 },
    data: {
      label: "fct_revenue",
      type: "transform",
      dataset: "marts",
      columns: [
        { name: "revenue_id", type: "UUID PK", description: "Surrogate key" },
        { name: "user_id", type: "UUID FK", description: "FK to dim_users" },
        { name: "amount", type: "DECIMAL(10,2)", description: "Revenue amount" },
        { name: "currency", type: "VARCHAR(3)", description: "ISO currency code" },
        { name: "revenue_date", type: "DATE", description: "Revenue recognition date" },
        { name: "payment_method", type: "VARCHAR(20)", description: "Payment method" },
      ],
    },
  },
  {
    id: "transform-marts-retention",
    type: "transformNode",
    position: { x: 960, y: 440 },
    data: {
      label: "fct_retention",
      type: "transform",
      dataset: "marts",
      columns: [
        { name: "cohort_date", type: "DATE", description: "Cohort start date" },
        { name: "user_id", type: "UUID FK", description: "FK to dim_users" },
        { name: "day_7_active", type: "BOOLEAN", description: "Active on D7" },
        { name: "day_14_active", type: "BOOLEAN", description: "Active on D14" },
        { name: "day_30_active", type: "BOOLEAN", description: "Active on D30" },
        { name: "channel", type: "VARCHAR(20)", description: "Acquisition channel" },
      ],
    },
  },
  {
    id: "dashboard-retention",
    type: "dashboardNode",
    position: { x: 80, y: 660 },
    data: { label: "User Retention", type: "dashboard", dataset: "grafana" },
  },
  {
    id: "dashboard-sales",
    type: "dashboardNode",
    position: { x: 400, y: 660 },
    data: { label: "Revenue Dashboard", type: "dashboard", dataset: "grafana" },
  },
  {
    id: "dashboard-activity",
    type: "dashboardNode",
    position: { x: 720, y: 660 },
    data: { label: "User Activity", type: "dashboard", dataset: "grafana" },
  },
  {
    id: "dashboard-exec",
    type: "dashboardNode",
    position: { x: 1040, y: 660 },
    data: { label: "Executive Summary", type: "dashboard", dataset: "metabase" },
  },
]

const initialEdges: Edge[] = [
  { id: "e1", source: "source-postgres-users", target: "transform-stage-users", animated: true, label: "ETL: hourly" },
  { id: "e2", source: "source-postgres-transactions", target: "transform-stage-payments", animated: true, label: "ETL: hourly" },
  { id: "e3", source: "source-kafka-events", target: "transform-stage-events", animated: true, label: "Stream: 5min" },
  { id: "e4", source: "transform-stage-users", target: "transform-marts-users", animated: true, label: "dbt run" },
  { id: "e5", source: "transform-stage-payments", target: "transform-marts-revenue", animated: true, label: "dbt run" },
  { id: "e6", source: "transform-stage-events", target: "transform-marts-retention", animated: true, label: "dbt run" },
  { id: "e7", source: "transform-stage-users", target: "transform-marts-retention", animated: true, label: "dbt run" },
  { id: "e8", source: "transform-marts-users", target: "dashboard-retention", animated: true, label: "Dashboard" },
  { id: "e9", source: "transform-marts-users", target: "dashboard-sales", animated: true, label: "Dashboard" },
  { id: "e10", source: "transform-marts-revenue", target: "dashboard-sales", animated: true, label: "Dashboard" },
  { id: "e11", source: "transform-marts-retention", target: "dashboard-retention", animated: true, label: "Dashboard" },
  { id: "e12", source: "transform-marts-retention", target: "dashboard-activity", animated: true, label: "Dashboard" },
  { id: "e13", source: "transform-marts-users", target: "dashboard-activity", animated: true, label: "Dashboard" },
  { id: "e14", source: "transform-marts-revenue", target: "dashboard-exec", animated: true, label: "Metabase" },
  { id: "e15", source: "transform-marts-retention", target: "dashboard-exec", animated: true, label: "Metabase" },
]

const typeConfig = {
  source: { icon: Database, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-300 dark:border-emerald-700", handle: "#10b981" },
  transform: { icon: Table, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-300 dark:border-blue-700", handle: "#3b82f6" },
  dashboard: { icon: BarChart3, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-300 dark:border-violet-700", handle: "#8b5cf6" },
}

function ColumnList({ columns }: { columns?: { name: string; type: string; description?: string }[] }) {
  const [open, setOpen] = useState(false)
  if (!columns || columns.length === 0) return null
  return (
    <div className="mt-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="size-2.5" /> : <ChevronRight className="size-2.5" />}
        <Columns className="size-2.5" />
        {columns.length} columns
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {columns.map((col) => (
            <div key={col.name} className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className="font-medium">{col.name}</span>
              <span className="text-muted-foreground">{col.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SourceNode({ data }: NodeProps) {
  const cfg = typeConfig.source
  return (
    <div className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} px-3 py-2 shadow-sm min-w-[160px]`}>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
      <div className="flex items-center gap-2">
        <Database className={`size-4 ${cfg.color}`} />
        <div>
          <p className="text-xs font-medium">{data.label as string}</p>
          <p className="text-[10px] text-muted-foreground">{data.dataset as string}</p>
        </div>
      </div>
      <ColumnList columns={(data as { columns?: LineageColumn[] }).columns} />
    </div>
  )
}

function TransformNode({ data }: NodeProps) {
  const cfg = typeConfig.transform
  return (
    <div className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} px-3 py-2 shadow-sm min-w-[160px]`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex items-center gap-2">
        <Table className={`size-4 ${cfg.color}`} />
        <div>
          <p className="text-xs font-medium">{data.label as string}</p>
          <p className="text-[10px] text-muted-foreground">{data.dataset as string}</p>
        </div>
      </div>
      <ColumnList columns={(data as { columns?: LineageColumn[] }).columns} />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  )
}

function DashboardNode({ data }: NodeProps) {
  const cfg = typeConfig.dashboard
  return (
    <div className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} px-3 py-2 shadow-sm min-w-[140px]`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-500" />
      <div className="flex items-center gap-2">
        <BarChart3 className={`size-4 ${cfg.color}`} />
        <div>
          <p className="text-xs font-medium">{data.label as string}</p>
          <p className="text-[10px] text-muted-foreground">{data.dataset as string}</p>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  sourceNode: SourceNode,
  transformNode: TransformNode,
  dashboardNode: DashboardNode,
}

export function ExpandedLineageExplorer() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Expanded Data Lineage</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <Database className="size-2.5" />
            3 sources
          </Badge>
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <Table className="size-2.5" />
            6 transforms
          </Badge>
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <BarChart3 className="size-2.5" />
            4 dashboards
          </Badge>
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ animated: true }}
        >
          <Background gap={20} size={1} />
          <Controls className="!border !rounded-lg !shadow-sm" />
          <MiniMap
            className="!border !rounded-lg !shadow-sm"
            nodeColor={(node) => {
              const t = (node.data?.type as string) ?? ""
              if (t === "source") return "#10b981"
              if (t === "transform") return "#3b82f6"
              return "#8b5cf6"
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
