import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";

// Generate order number
async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const count = await Order.countDocuments();
  return `MES-${year}${month}-${(count + 1).toString().padStart(5, "0")}`;
}

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

    // Validate product availability
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

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create pending order first
    const order = await Order.create({
      orderNumber,
      customer,
      userId: userId || null,
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

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.productName,
          images: item.productImage ? [item.productImage] : [],
          metadata: {
            productId: item.product,
            sku: item.productSku,
          },
        },
        unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item if applicable
    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
            images: [],
            metadata: {},
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }

    // Add tax as a line item
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tax (${(taxRate * 100).toFixed(1)}%)`,
            images: [],
            metadata: {},
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customer.email,
      success_url: `${baseUrl}/store/order-confirmation/${order.orderNumber}?payment=success`,
      cancel_url: `${baseUrl}/store/checkout?payment=cancelled&orderId=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

