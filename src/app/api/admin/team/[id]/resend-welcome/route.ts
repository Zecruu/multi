import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { sendTeamWelcomeEmail } from "@/lib/email-service";
import crypto from "crypto";

// POST resend welcome email to team member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Find the user
    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a team member
    if (!["admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json(
        { error: "User is not a team member" },
        { status: 400 }
      );
    }

    // Generate a new temporary password
    const temporaryPassword = crypto.randomBytes(8).toString("hex");

    // Update user's password
    user.password = temporaryPassword;
    await user.save();

    // Send welcome email with new temporary password
    const result = await sendTeamWelcomeEmail(
      user.email,
      user.name,
      user.role,
      temporaryPassword
    );

    if (!result.success) {
      console.error("Failed to send welcome email:", result.error);
      return NextResponse.json(
        { error: "Failed to send welcome email. Please check email configuration." },
        { status: 500 }
      );
    }

    console.log(`Welcome email resent to ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Welcome email sent to ${user.email}`,
    });
  } catch (error) {
    console.error("Error resending welcome email:", error);
    return NextResponse.json(
      { error: "Failed to resend welcome email" },
      { status: 500 }
    );
  }
}
