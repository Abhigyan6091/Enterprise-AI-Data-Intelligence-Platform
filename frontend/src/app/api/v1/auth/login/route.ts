import { NextRequest, NextResponse } from "next/server"
import { findUserByEmail } from "@/lib/auth-store"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = findUserByEmail(email)
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      token: `tok_${user.id}_${Date.now()}`,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
