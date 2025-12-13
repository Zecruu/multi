import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { sendOrderStatusEmail } from "@/lib/email-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id).populate("client", "name email company");

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Get original order to check if status changed
    const originalOrder = await Order.findById(id);
    const previousStatus = originalOrder?.status;

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    ).populate("client", "name email company");

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Send email notification if status changed to specific values
    const statusesToNotify = ["processing", "ready_for_pickup", "shipped", "delivered", "cancelled"];
    if (body.status && body.status !== previousStatus && statusesToNotify.includes(body.status)) {
      const customerEmail = order.customer?.email;
      const customerName = order.customer?.name || "Customer";
      if (customerEmail) {
        try {
          await sendOrderStatusEmail({
            to: customerEmail,
            customerName,
            orderNumber: order.orderNumber,
            status: body.status as "processing" | "ready_for_pickup" | "shipped" | "delivered" | "cancelled",
            trackingNumber: body.trackingNumber,
            estimatedDelivery: body.estimatedDelivery,
          });
          console.log(`Order status email sent for ${order.orderNumber} - Status: ${body.status}`);
        } catch (emailError) {
          console.error("Failed to send order status email:", emailError);
        }
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
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

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
