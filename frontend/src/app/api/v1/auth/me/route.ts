import { NextRequest, NextResponse } from "next/server"
import { findUserByEmail } from "@/lib/auth-store"

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization")
  if (!auth || !auth.startsWith("tok_")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const userId = auth.slice(4).split("_").slice(0, 2).join("_")
  const user = findUserByEmail(userId)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  })
}
