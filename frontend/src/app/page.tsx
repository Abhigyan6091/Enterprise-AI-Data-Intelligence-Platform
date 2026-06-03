"use client"

import { Sun, Moon } from "lucide-react"
import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { CommandPalette } from "@/components/command-palette"
import { ChatWorkspace } from "@/components/chat-workspace"
import { RetrievalInspector } from "@/components/retrieval-inspector"
import { AgentTimeline } from "@/components/agent-timeline"
import { ExpandedLineageExplorer } from "@/components/expanded-lineage"
import { EvaluationDashboard } from "@/components/evaluation-dashboard"
import { SessionReplay } from "@/components/session-replay"
import { SourceDocumentViewer } from "@/components/source-document-viewer"
import { ObservabilityPage } from "@/components/observability-page"
import { QueryTraceDrawer } from "@/components/query-trace-drawer"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"

export default function Home() {
  const activeView = useStore((s) => s.activeView)
  const [dark, setDark] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  return (
    <>
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0">
        <header className="flex h-12 items-center justify-end gap-2 border-b px-4">
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </header>
        <div className="flex flex-1 min-h-0">
          {activeView === "chat" && <ChatWorkspace />}
          {activeView === "retrieval" && <RetrievalInspector />}
          {activeView === "agents" && <AgentTimeline />}
          {activeView === "lineage" && <ExpandedLineageExplorer />}
          {activeView === "observability" && <ObservabilityPage />}
          {activeView === "evaluation" && <EvaluationDashboard />}
          {activeView === "sessions" && <SessionReplay />}
          {activeView === "documents" && <SourceDocumentViewer />}
        </div>
      </main>
      <CommandPalette />
      <QueryTraceDrawer />
    </>
  )
}
