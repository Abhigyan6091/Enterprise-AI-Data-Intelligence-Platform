import { NextRequest } from "next/server"
import { getBackendUrl } from "@/lib/config"

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl()
    const { searchParams } = new URL(request.url)

    const response = await fetch(
      `${backendUrl}/observability?${searchParams.toString()}`,
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
    console.error("Observability API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
