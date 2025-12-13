import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString()
      );

      // Check if session is expired
      if (sessionData.exp && Date.now() > sessionData.exp) {
        return NextResponse.json(
          { error: "Session expired" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        user: {
          id: sessionData.userId,
          name: sessionData.name || sessionData.username || "Admin User",
          email: sessionData.email || sessionData.username,
          role: sessionData.role || "admin",
        },
      });
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error getting admin user:", error);
    return NextResponse.json(
      { error: "Failed to get user info" },
      { status: 500 }
    );
  }
}

