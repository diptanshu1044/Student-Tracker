import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const AUTH_COOKIE_NAME = "studentos_logged_in"
const PUBLIC_PATHS = ["/login", "/verify-email", "/reset-password"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath))
  const isLoggedIn = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1"

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && pathname === "/login") {
    const dashboardUrl = new URL("/", request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/:path*"],
}
