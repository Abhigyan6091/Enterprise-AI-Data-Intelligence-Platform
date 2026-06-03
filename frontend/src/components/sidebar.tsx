"use client"

import { MessageSquare, Search, GitBranch, FlaskConical, Timer, PanelLeftClose, PanelLeft, Plus, History, Activity, BookOpen, RotateCcw, LogOut, User, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useStore } from "@/lib/store"
import type { AppView } from "@/lib/types"

const navItems: { view: AppView; label: string; icon: LucideIcon }[] = [
  { view: "chat", label: "Chat", icon: MessageSquare },
  { view: "retrieval", label: "Retrieval", icon: Search },
  { view: "agents", label: "Agents", icon: Timer },
  { view: "lineage", label: "Lineage", icon: GitBranch },
  { view: "observability", label: "Observability", icon: Activity },
  { view: "evaluation", label: "Evaluation", icon: FlaskConical },
  { view: "sessions", label: "Replay", icon: RotateCcw },
  { view: "documents", label: "Documents", icon: BookOpen },
]

export function Sidebar() {
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const activeView = useStore((s) => s.activeView)
  const setActiveView = useStore((s) => s.setActiveView)
  const sessions = useStore((s) => s.sessions)
  const activeSessionId = useStore((s) => s.activeSessionId)
  const setActiveSession = useStore((s) => s.setActiveSession)
  const createSession = useStore((s) => s.createSession)
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)

  return (
    <>
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar transition-all duration-200",
          sidebarOpen ? "w-56" : "w-0 overflow-hidden md:w-12",
        )}
      >
        <div className="flex h-12 items-center justify-between px-3">
          {sidebarOpen && (
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              RAG Console
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
          </Button>
        </div>

        <Separator />

        <nav className="flex flex-col gap-0.5 p-2">
          {navItems.map(({ view, label, icon: Icon }) => (
            <Tooltip key={view}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveView(view)}
                  className={cn(
                    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors",
                    activeView === view
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {sidebarOpen && <span>{label}</span>}
                </button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">{label}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>

        <Separator />

        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sessions
              </span>
              <Button variant="ghost" size="icon-xs" onClick={createSession}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-2">
              <div className="flex flex-col gap-0.5">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      activeSessionId === session.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <History className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{session.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {session.message_count} messages
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User section */}
        <Separator />
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-3 text-muted-foreground" />
          </div>
          {sidebarOpen && user && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={logout} aria-label="Sign out">
                <LogOut className="size-3.5" />
              </Button>
            </TooltipTrigger>
            {!sidebarOpen && <TooltipContent side="right">Sign out</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </>
  )
}
