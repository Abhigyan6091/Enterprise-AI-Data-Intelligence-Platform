"use client"

import { useEffect } from "react"
import { Command } from "cmdk"
import { Search, MessageSquare, GitBranch, FlaskConical, Timer, Plus, Activity, BookOpen, RotateCcw } from "lucide-react"
import { useStore } from "@/lib/store"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export function CommandPalette() {
  const open = useStore((s) => s.commandPaletteOpen)
  const setOpen = useStore((s) => s.setCommandPaletteOpen)
  const setActiveView = useStore((s) => s.setActiveView)
  const createSession = useStore((s) => s.createSession)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, setOpen])

  function runAction(action: () => void) {
    action()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] -translate-y-0 p-0 sm:max-w-[500px]">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search or jump to..."
              className="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Views" className="text-xs text-muted-foreground">
              <Command.Item
                onSelect={() => runAction(() => setActiveView("chat"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <MessageSquare className="size-4" />
                Open Chat
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => setActiveView("agents"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <Timer className="size-4" />
                Open Agent Timeline
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => setActiveView("lineage"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <GitBranch className="size-4" />
                Open Lineage Explorer
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => setActiveView("observability"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <Activity className="size-4" />
                Open Observability
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => setActiveView("evaluation"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <FlaskConical className="size-4" />
                Open Evaluation Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => setActiveView("sessions"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <RotateCcw className="size-4" />
                Open Session Replay
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => setActiveView("documents"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <BookOpen className="size-4" />
                Open Source Documents
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Actions" className="text-xs text-muted-foreground">
              <Command.Item
                onSelect={() => runAction(createSession)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent"
              >
                <Plus className="size-4" />
                New Session
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-2 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>⌘K Close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
