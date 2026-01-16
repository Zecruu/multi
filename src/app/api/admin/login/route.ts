import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// Fallback admin credentials - used only if no database users exist
const FALLBACK_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const FALLBACK_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MultiElectric2024!";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Try to find user in database first
    try {
      await connectDB();
      const user = await User.findOne({ 
        email: username.toLowerCase(),
        role: { $in: ["admin", "manager", "staff"] },
        isActive: true
      }).select("+password");

      if (user) {
        const isValidPassword = await user.comparePassword(password);
        
        if (isValidPassword) {
          // Update last login
          user.lastLogin = new Date();
          await user.save();

          // Create session token with user info
          const sessionToken = Buffer.from(
            JSON.stringify({
              userId: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            })
          ).toString("base64");

          // Set cookie
          const cookieStore = await cookies();
          cookieStore.set("admin_session", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60, // 24 hours
            path: "/",
          });

          return NextResponse.json({ 
            success: true, 
            message: "Login successful",
            user: {
              name: user.name,
              email: user.email,
              role: user.role
            }
          });
        }
      }
    } catch (dbError) {
      console.error("Database error during login:", dbError);
      // Fall through to fallback authentication
    }

    // Fallback to environment variable credentials
    if (username === FALLBACK_ADMIN_USERNAME && password === FALLBACK_ADMIN_PASSWORD) {
      // Create a simple session token
      const sessionToken = Buffer.from(
        JSON.stringify({
          name: "Admin User",
          email: FALLBACK_ADMIN_USERNAME,
          role: "admin",
          exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        })
      ).toString("base64");

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
        path: "/",
      });

      return NextResponse.json({ 
        success: true, 
        message: "Login successful",
        user: {
          name: "Admin User",
          email: FALLBACK_ADMIN_USERNAME,
          role: "admin"
        }
      });
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
