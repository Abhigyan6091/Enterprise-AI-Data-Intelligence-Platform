"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useStore } from "@/lib/store"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useStore((s) => s.user)
  const isAuthLoading = useStore((s) => s.isAuthLoading)
  const checkAuth = useStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const isAuthPage = pathname === "/login" || pathname === "/signup"

  useEffect(() => {
    if (isAuthLoading) return

    if (!user && !isAuthPage) {
      router.replace("/login")
    }

    if (user && isAuthPage) {
      router.replace("/")
    }
  }, [user, isAuthLoading, isAuthPage, router])

  if (isAuthLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isAuthPage) {
    return <>{children}</>
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
