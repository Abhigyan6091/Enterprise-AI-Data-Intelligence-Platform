import { NextRequest, NextResponse } from "next/server"
import { findUserByEmail, addUser } from "@/lib/auth-store"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    if (findUserByEmail(email)) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const user = {
      id: `user_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password,
      created_at: Date.now(),
    }
    addUser(user)

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      token: `tok_${user.id}_${Date.now()}`,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
