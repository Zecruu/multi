import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { sendTeamWelcomeEmail } from "@/lib/email-service";
import crypto from "crypto";

// GET all team members (admin, manager, staff)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");
    const isActive = searchParams.get("isActive");

    const query: any = {
      role: { $in: ["admin", "manager", "staff"] },
    };

    if (role) {
      query.role = role;
    }

    if (isActive !== null) {
      query.isActive = isActive === "true";
    }

    const users = await User.find(query)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .sort({ createdAt: -1 });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST create new team member
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, role, phone } = body;

    // Validation
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["admin", "manager", "staff"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, manager, or staff" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Generate temporary password
    const temporaryPassword = crypto.randomBytes(8).toString("hex");

    // Create new user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: temporaryPassword,
      role,
      phone,
      isActive: true,
    });

    // Send welcome email with temporary password
    try {
      await sendTeamWelcomeEmail(user.email, user.name, user.role, temporaryPassword);
      console.log(`Team welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send team welcome email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        message: "Team member created successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating team member:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 }
    );
  }
}

