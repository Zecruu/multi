import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs";

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const contentType = request.headers.get("content-type") || "";

    if (!key || !key.startsWith("uploads/products/") || key.includes("..")) {
      return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
    }

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const uploadRoot = path.resolve(process.cwd(), "public", "uploads");
    const target = path.resolve(process.cwd(), "public", key);

    if (!target.startsWith(uploadRoot + path.sep)) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error writing local upload:", error);
    return NextResponse.json(
      { error: "Failed to write local upload" },
      { status: 500 }
    );
  }
}
