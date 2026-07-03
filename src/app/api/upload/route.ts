import { NextRequest, NextResponse } from "next/server";
import {
  getPresignedUploadUrl,
  generateImageKey,
  isS3Configured,
} from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, contentType, productId } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and content type are required" },
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF" },
        { status: 400 }
      );
    }

    const productKey = generateImageKey(productId || "temp", filename);

    if (!isS3Configured()) {
      return NextResponse.json(
        { error: "S3 upload is not configured on the server" },
        { status: 500 }
      );
    }

    const key = productKey;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({
      uploadUrl,
      key,
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
