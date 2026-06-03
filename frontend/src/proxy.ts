import { NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url)

  if (pathname.startsWith("/_next/") || pathname.startsWith("/static/") || pathname === "/favicon.ico") {
    return
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
