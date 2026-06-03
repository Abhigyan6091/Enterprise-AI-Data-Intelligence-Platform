import { NextRequest } from "next/server"
import { getBackendUrl } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl()
    const { searchParams } = new URL(request.url)

    const response = await fetch(
      `${backendUrl}/sessions?${searchParams.toString()}`,
      { signal: AbortSignal.timeout(10000) },
    )

    if (!response.ok) {
      return Response.json({ error: `Backend error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return Response.json({ error: "Backend request timed out" }, { status: 504 })
    }
    console.error("Sessions API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const backendUrl = getBackendUrl()

    const response = await fetch(`${backendUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return Response.json(
        { error: `Backend error: ${response.status}`, detail: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return Response.json({ error: "Backend request timed out" }, { status: 504 })
    }
    console.error("Sessions API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
