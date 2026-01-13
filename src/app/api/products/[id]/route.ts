import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { logProductAction } from "@/lib/activity-logger";

// Helper to get admin user from session
async function getAdminUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");
  if (!sessionCookie) return null;
  
  try {
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    return {
      name: sessionData.name || sessionData.username || "Admin",
      role: sessionData.role || "admin",
    };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Log the incoming data for debugging
    console.log("Updating product with data:", JSON.stringify({
      isOnSale: body.isOnSale,
      salePrice: body.salePrice,
      price: body.price,
    }));

    // Build update object, explicitly handling sale fields
    const updateData = { ...body };
    
    // If isOnSale is false or salePrice is not provided, unset them
    if (!body.isOnSale) {
      updateData.isOnSale = false;
      updateData.salePrice = null;
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    console.log("Updated product:", JSON.stringify({
      isOnSale: product.isOnSale,
      salePrice: product.salePrice,
      price: product.price,
    }));

    // Log activity
    const adminUser = await getAdminUser();
    if (adminUser) {
      await logProductAction(
        "updated",
        product.name,
        product._id.toString(),
        adminUser.name,
        adminUser.role,
        `Product "${product.name}" (SKU: ${product.sku}) updated`,
        { sku: product.sku, price: product.price, status: product.status }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Get product first for logging
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const productName = product.name;
    const productSku = product.sku;

    // Delete the product
    await Product.findByIdAndDelete(id);

    // Log activity
    const adminUser = await getAdminUser();
    if (adminUser) {
      await logProductAction(
        "deleted",
        productName,
        id,
        adminUser.name,
        adminUser.role,
        `Product "${productName}" (SKU: ${productSku}) deleted`,
        { sku: productSku }
      );
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
