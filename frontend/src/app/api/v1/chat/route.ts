import { NextRequest } from "next/server"
import { getBackendUrl } from "@/lib/config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const backendUrl = getBackendUrl()

    const response = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return Response.json(
        { error: `Backend request failed: ${response.status}`, detail: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return Response.json({ error: "Backend request timed out" }, { status: 504 })
    }
    console.error("Chat API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
