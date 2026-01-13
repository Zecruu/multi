import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Wishlist from "@/models/Wishlist";
import Product from "@/models/Product";
import { authOptions } from "@/lib/auth";

// GET - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const wishlist = await Wishlist.findOne({ userId: session.user.id })
      .populate({
        path: "items.productId",
        model: Product,
        select: "name slug sku price compareAtPrice images category quantity status",
      });

    if (!wishlist) {
      return NextResponse.json({ items: [] });
    }

    // Filter out any null products (deleted products)
    const validItems = wishlist.items.filter((item) => item.productId !== null);

    return NextResponse.json({ items: validItems });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

// POST - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ userId: session.user.id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: session.user.id,
        items: [{ productId, addedAt: new Date() }],
      });
    } else {
      // Check if product already in wishlist
      const existingItem = wishlist.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        return NextResponse.json(
          { error: "Product already in wishlist" },
          { status: 400 }
        );
      }

      wishlist.items.push({ productId, addedAt: new Date() });
      await wishlist.save();
    }

    return NextResponse.json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return NextResponse.json(
      { error: "Failed to add to wishlist" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const wishlist = await Wishlist.findOne({ userId: session.user.id });

    if (!wishlist) {
      return NextResponse.json(
        { error: "Wishlist not found" },
        { status: 404 }
      );
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId
    );
    await wishlist.save();

    return NextResponse.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return NextResponse.json(
      { error: "Failed to remove from wishlist" },
      { status: 500 }
    );
  }
}
