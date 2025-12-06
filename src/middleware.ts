import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes (except login page)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const sessionCookie = request.cookies.get("admin_session");

    if (!sessionCookie) {
      // Redirect to login if no session
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      // Decode and validate session
      const session = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );

      // Check if session is expired
      if (session.exp < Date.now()) {
        // Session expired, redirect to login
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.delete("admin_session");
        return response;
      }

      // Session valid, continue
      return NextResponse.next();
    } catch (error) {
      // Invalid session, redirect to login
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("admin_session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
