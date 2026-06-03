"use client"

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
import { Database, Table, BarChart3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const initialNodes: Node[] = [
  {
    id: "source-postgres-users",
    type: "sourceNode",
    position: { x: 250, y: 0 },
    data: { label: "users", type: "source", dataset: "postgres.public" },
  },
  {
    id: "source-postgres-transactions",
    type: "sourceNode",
    position: { x: 550, y: 0 },
    data: { label: "transactions", type: "source", dataset: "postgres.public" },
  },
  {
    id: "transform-stage-users",
    type: "transformNode",
    position: { x: 250, y: 150 },
    data: { label: "stg_users", type: "transform", dataset: "stage" },
  },
  {
    id: "transform-stage-payments",
    type: "transformNode",
    position: { x: 550, y: 150 },
    data: { label: "stg_payments", type: "transform", dataset: "stage" },
  },
  {
    id: "transform-marts-users",
    type: "transformNode",
    position: { x: 250, y: 300 },
    data: { label: "dim_users", type: "transform", dataset: "marts" },
  },
  {
    id: "transform-marts-revenue",
    type: "transformNode",
    position: { x: 550, y: 300 },
    data: { label: "fct_revenue", type: "transform", dataset: "marts" },
  },
  {
    id: "dashboard-retention",
    type: "dashboardNode",
    position: { x: 100, y: 450 },
    data: { label: "User Retention", type: "dashboard", dataset: "grafana" },
  },
  {
    id: "dashboard-sales",
    type: "dashboardNode",
    position: { x: 400, y: 450 },
    data: { label: "Sales Overview", type: "dashboard", dataset: "grafana" },
  },
]

const initialEdges: Edge[] = [
  { id: "e1", source: "source-postgres-users", target: "transform-stage-users", animated: true },
  { id: "e2", source: "source-postgres-transactions", target: "transform-stage-payments", animated: true },
  { id: "e3", source: "transform-stage-users", target: "transform-marts-users", animated: true },
  { id: "e4", source: "transform-stage-payments", target: "transform-marts-revenue", animated: true },
  { id: "e5", source: "transform-marts-users", target: "dashboard-retention", animated: true },
  { id: "e6", source: "transform-marts-users", target: "dashboard-sales", animated: true },
  { id: "e7", source: "transform-marts-revenue", target: "dashboard-sales", animated: true },
]

const typeConfig = {
  source: { icon: Database, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-300 dark:border-emerald-700" },
  transform: { icon: Table, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-300 dark:border-blue-700" },
  dashboard: { icon: BarChart3, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-300 dark:border-violet-700" },
}

function SourceNode({ data }: NodeProps) {
  const cfg = typeConfig.source
  return (
    <div className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} px-3 py-2 shadow-sm`}>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
      <div className="flex items-center gap-2">
        <cfg.icon className={`size-4 ${cfg.color}`} />
        <div>
          <p className="text-xs font-medium">{data.label as string}</p>
          <p className="text-[10px] text-muted-foreground">{data.dataset as string}</p>
        </div>
      </div>
    </div>
  )
}

function TransformNode({ data }: NodeProps) {
  const cfg = typeConfig.transform
  return (
    <div className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} px-3 py-2 shadow-sm`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex items-center gap-2">
        <cfg.icon className={`size-4 ${cfg.color}`} />
        <div>
          <p className="text-xs font-medium">{data.label as string}</p>
          <p className="text-[10px] text-muted-foreground">{data.dataset as string}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  )
}

function DashboardNode({ data }: NodeProps) {
  const cfg = typeConfig.dashboard
  return (
    <div className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} px-3 py-2 shadow-sm`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-500" />
      <div className="flex items-center gap-2">
        <cfg.icon className={`size-4 ${cfg.color}`} />
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

export function LineageExplorer() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Lineage Explorer</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <div className="size-2 rounded-full bg-emerald-500" />
            Sources
          </Badge>
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <div className="size-2 rounded-full bg-blue-500" />
            Transforms
          </Badge>
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <div className="size-2 rounded-full bg-violet-500" />
            Dashboards
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
          proOptions={{ hideAttribution: true }}
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
