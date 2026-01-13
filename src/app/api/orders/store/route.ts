import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";

// POST - Create a store order
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { customer, userId, items, subtotal, tax, taxRate, shipping, total, shippingAddress } = body;

    // Validate required fields
    if (!customer?.email || !customer?.name || !items?.length || !shippingAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate and update product quantities
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productName}` },
          { status: 400 }
        );
      }
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.productName}. Available: ${product.quantity}` },
          { status: 400 }
        );
      }
    }

    // Create order
    const order = await Order.create({
      customer,
      userId,
      items: items.map((item: any) => ({
        product: item.product,
        productName: item.productName,
        productSku: item.productSku,
        productImage: item.productImage,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: 0,
        totalPrice: item.totalPrice,
        totalCost: 0,
      })),
      subtotal,
      tax,
      taxRate,
      shipping,
      discount: 0,
      total,
      totalCost: 0,
      shippingAddress,
      status: "pending",
      paymentStatus: "pending",
    });

    // Update product quantities
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Error creating store order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
