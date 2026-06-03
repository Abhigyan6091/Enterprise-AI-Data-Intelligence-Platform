"use client"

import { RotateCcw, Clock, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useStore } from "@/lib/store"
import type { SessionReplay } from "@/lib/types"

const replayHistory: SessionReplay[] = [
  {
    id: "replay-1",
    session_id: "session-3",
    messages: [
      { id: "r1", role: "user", content: "Show me the revenue pipeline lineage", timestamp: Date.now() - 86400000 },
      { id: "r2", role: "assistant", content: "The revenue pipeline flows from `source.postgres.transactions` through `transform.stage.payments` (staging), then to `transform.marts.fct_revenue` (marts). This feeds the `Sales Overview` dashboard.", timestamp: Date.now() - 86390000, confidence_score: 0.94, latency_ms: 3210 },
      { id: "r3", role: "user", content: "Which columns are in fct_revenue?", timestamp: Date.now() - 86300000 },
      { id: "r4", role: "assistant", content: "`fct_revenue` contains: `transaction_id`, `user_id`, `amount`, `currency`, `payment_method`, `revenue_date`, `created_at`. The `amount` field is summed for the Sales Overview dashboard.", timestamp: Date.now() - 86290000, confidence_score: 0.91, latency_ms: 2850 },
    ],
    checkpoint_key: "checkpoint:session-3:*",
    created_at: Date.now() - 86400000,
  },
  {
    id: "replay-2",
    session_id: "session-2",
    messages: [
      { id: "r5", role: "user", content: "Find slow-running SQL queries", timestamp: Date.now() - 7200000 },
      { id: "r6", role: "assistant", content: "I found 3 slow queries in the analytics schema:\n1. `daily_active_users` (2.4s) - missing index on `sessions.created_at`\n2. `retention_cohort` (4.1s) - full table scan on `user_events`\n3. `revenue_ytd` (1.8s) - join without composite key", timestamp: Date.now() - 7190000, confidence_score: 0.87, latency_ms: 4560 },
    ],
    checkpoint_key: "checkpoint:session-2:*",
    created_at: Date.now() - 7200000,
  },
  {
    id: "replay-3",
    session_id: "default",
    messages: [
      { id: "r7", role: "user", content: "What's our current user retention rate?", timestamp: Date.now() - 3600000 },
      { id: "r8", role: "assistant", content: "**30-Day Retention: 42%** (↑ 3% MoM)\n- D7 retention: 68%\n- D14 retention: 55%\n- D30 retention: 42%\n\nSegment breakdown:\n- Organic: 48%\n- Paid: 36%\n- Referral: 52%", timestamp: Date.now() - 3590000, confidence_score: 0.92, latency_ms: 3890, citations: [{ text: "Retention is calculated as users returning within 30 days of first visit", metadata: { source: "analytics/definitions.md", model: "retention" }, relevance_score: 0.94 }] },
    ],
    checkpoint_key: "checkpoint:default:*",
    created_at: Date.now() - 3600000,
  },
]

export function SessionReplay() {
  const activeReplay = useStore((s) => s.activeReplay)
  const setActiveReplay = useStore((s) => s.setActiveReplay)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Session Replay</h2>
        <Badge variant="outline" className="text-[10px]">{replayHistory.length} sessions</Badge>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-64 border-r shrink-0">
          <div className="p-2 space-y-1">
            {replayHistory.map((replay) => (
              <button
                key={replay.id}
                onClick={() => setActiveReplay(replay)}
                className={`w-full text-left rounded-md p-2 transition-colors text-xs ${
                  activeReplay?.id === replay.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <RotateCcw className="size-3 shrink-0" />
                  <span className="truncate text-xs">{replay.messages[0]?.content.slice(0, 40)}...</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="size-2.5" />
                  <span className="text-[10px]">{replay.messages.length} messages</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {activeReplay ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RotateCcw className="size-3" />
                <span>Replaying session from Redis checkpoint: <code className="text-[10px] bg-muted px-1 rounded">{activeReplay.checkpoint_key}</code></span>
              </div>
              <Separator />
              <div className="space-y-4">
                {activeReplay.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] ${msg.role === "user" ? "order-1" : "order-1"}`}>
                      <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {msg.content}
                      </div>
                      {msg.role === "assistant" && msg.confidence_score !== undefined && (
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CheckCircle2 className="size-2.5" />
                            {(msg.confidence_score * 100).toFixed(0)}%
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="size-2.5" />
                            {msg.latency_ms}ms
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <RotateCcw className="mx-auto size-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">Select a session to replay</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Browse past conversations from Redis checkpoint storage
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
