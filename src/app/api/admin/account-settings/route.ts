import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { hasAdminPanelAccess } from "@/lib/admin-roles";
import { sendPasswordChangedEmail } from "@/lib/email-service";

type AdminSession = {
  userId?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  exp?: number;
};

function parseAdminSession(value: string): AdminSession | null {
  try {
    const data = JSON.parse(Buffer.from(value, "base64").toString());
    if (data.exp && Date.now() > data.exp) return null;
    if (!hasAdminPanelAccess(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  const session = sessionCookie ? parseAdminSession(sessionCookie.value) : null;

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!session.userId && !session.email) {
    return NextResponse.json(
      { error: "This fallback admin account is managed by environment variables." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (newPassword !== undefined && newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  if (name === undefined && newPassword === undefined) {
    return NextResponse.json(
      { error: "No account changes provided" },
      { status: 400 }
    );
  }

  await connectDB();

  const user = session.userId
    ? await User.findById(session.userId)
    : await User.findOne({ email: session.email?.toLowerCase() });

  if (!user || !hasAdminPanelAccess(user.role) || !user.isActive) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (name !== undefined) user.name = name;
  if (newPassword !== undefined) user.password = newPassword;

  await user.save();

  if (newPassword !== undefined) {
    try {
      await sendPasswordChangedEmail(user.email, user.name);
    } catch (emailError) {
      console.error("Failed to send password changed email:", emailError);
    }
  }

  const updatedSession: AdminSession = {
    ...session,
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const response = NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
  const maxAge = session.exp
    ? Math.max(Math.floor((session.exp - Date.now()) / 1000), 60)
    : 24 * 60 * 60;

  response.cookies.set(
    "admin_session",
    Buffer.from(JSON.stringify(updatedSession)).toString("base64"),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    }
  );

  return response;
}
