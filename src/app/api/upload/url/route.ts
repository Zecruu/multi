import { NextRequest, NextResponse } from "next/server";
import { getImageUrl } from "@/lib/s3";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    const url = getImageUrl(key);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error getting image URL:", error);
    return NextResponse.json(
      { error: "Failed to get image URL" },
      { status: 500 }
    );
  }
}
