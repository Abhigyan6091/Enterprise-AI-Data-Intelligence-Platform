import { create } from "zustand"
import type { ChatMessage, Session, AppView, EvalMetric, QueryTrace, SourceDocument, ObservabilitySnapshot, SessionReplay, User } from "./types"

interface AuthState {
  user: User | null
  token: string | null
  isAuthLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

interface AppState extends AuthState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  activeView: AppView
  setActiveView: (view: AppView) => void

  sessions: Session[]
  activeSessionId: string | null
  setActiveSession: (id: string) => void
  createSession: () => void

  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void

  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  evalMetrics: EvalMetric[]
  setEvalMetrics: (metrics: EvalMetric[]) => void

  isProcessing: boolean
  setIsProcessing: (v: boolean) => void

  traceDrawerOpen: boolean
  activeTrace: QueryTrace | null
  openTraceDrawer: (trace: QueryTrace) => void
  closeTraceDrawer: () => void

  sessionReplays: SessionReplay[]
  activeReplay: SessionReplay | null
  setActiveReplay: (replay: SessionReplay | null) => void
  loadSessionReplays: () => void

  sourceDocuments: SourceDocument[]
  setSourceDocuments: (docs: SourceDocument[]) => void
  activeDocument: SourceDocument | null
  setActiveDocument: (doc: SourceDocument | null) => void

  observability: ObservabilitySnapshot | null
  setObservability: (snap: ObservabilitySnapshot) => void
}

export const useStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  activeView: "chat",
  setActiveView: (view) => set({ activeView: view }),

  sessions: [
    {
      id: "default",
      title: "Data pipeline analysis",
      created_at: Date.now() - 3600000,
      message_count: 5,
    },
    {
      id: "session-2",
      title: "SQL query debugging",
      created_at: Date.now() - 7200000,
      message_count: 3,
    },
    {
      id: "session-3",
      title: "Lineage exploration: revenue pipeline",
      created_at: Date.now() - 86400000,
      message_count: 8,
    },
  ],
  activeSessionId: "default",
  setActiveSession: (id) => set({ activeSessionId: id }),

  createSession: () => {
    const id = `session-${Date.now()}`
    const session: Session = {
      id,
      title: "New conversation",
      created_at: Date.now(),
      message_count: 0,
    }
    set((s) => ({ sessions: [session, ...s.sessions], activeSessionId: id, messages: [] }))
  },

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, partial) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    })),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  evalMetrics: [
    { name: "Answer Relevancy", value: 0.89, target: 0.85, unit: "%" },
    { name: "Hallucination Rate", value: 0.03, target: 0.05, unit: "%" },
    { name: "Avg Latency", value: 1240, target: 2000, unit: "ms" },
    { name: "Avg Cost", value: 0.0082, target: 0.01, unit: "USD" },
    { name: "Retrieval Precision", value: 0.92, target: 0.90, unit: "%" },
    { name: "Citation Accuracy", value: 0.95, target: 0.90, unit: "%" },
  ],
  setEvalMetrics: (metrics) => set({ evalMetrics: metrics }),

  isProcessing: false,
  setIsProcessing: (v) => set({ isProcessing: v }),

  traceDrawerOpen: false,
  activeTrace: null,
  openTraceDrawer: (trace) => set({ traceDrawerOpen: true, activeTrace: trace }),
  closeTraceDrawer: () => set({ traceDrawerOpen: false }),

  sessionReplays: [],
  activeReplay: null,
  setActiveReplay: (replay) => set({ activeReplay: replay }),
  loadSessionReplays: () => {
    const replays: SessionReplay[] = [
      {
        id: "replay-1",
        session_id: "default",
        messages: [],
        checkpoint_key: "checkpoint:default:*",
        created_at: Date.now() - 3600000,
      },
      {
        id: "replay-2",
        session_id: "session-2",
        messages: [],
        checkpoint_key: "checkpoint:session-2:*",
        created_at: Date.now() - 7200000,
      },
    ]
    set({ sessionReplays: replays })
  },

  sourceDocuments: [],
  setSourceDocuments: (docs) => set({ sourceDocuments: docs }),
  activeDocument: null,
  setActiveDocument: (doc) => set({ activeDocument: doc }),

  observability: null,
  setObservability: (snap) => set({ observability: snap }),

  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("rag_token") : null,
  isAuthLoading: true,

  login: async (email, password) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }))
      throw new Error(err.error || "Login failed")
    }
    const data = await res.json()
    localStorage.setItem("rag_token", data.token)
    localStorage.setItem("rag_user", JSON.stringify(data.user))
    set({ user: data.user, token: data.token })
  },

  signup: async (name, email, password) => {
    const res = await fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Signup failed" }))
      throw new Error(err.error || "Signup failed")
    }
    const data = await res.json()
    localStorage.setItem("rag_token", data.token)
    localStorage.setItem("rag_user", JSON.stringify(data.user))
    set({ user: data.user, token: data.token })
  },

  logout: () => {
    localStorage.removeItem("rag_token")
    localStorage.removeItem("rag_user")
    set({ user: null, token: null })
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem("rag_token")
      const stored = localStorage.getItem("rag_user")
      if (token && stored) {
        set({ user: JSON.parse(stored), token, isAuthLoading: false })
        return
      }
    } catch {}
    set({ isAuthLoading: false })
  },
}))
