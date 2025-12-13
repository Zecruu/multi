import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Stripe from "stripe";
import { sendOrderConfirmationEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  await connectDB();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        // Update order status
        const order = await Order.findByIdAndUpdate(
          orderId,
          {
            paymentStatus: "paid",
            status: "processing",
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
          },
          { new: true }
        );

        if (order) {
          // Update product quantities
          for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { quantity: -item.quantity },
            });
          }
          console.log(`Order ${order.orderNumber} payment completed`);

          // Send order confirmation email
          if (order.customer?.email) {
            try {
              await sendOrderConfirmationEmail({
                to: order.customer.email,
                customerName: order.customer.name,
                orderNumber: order.orderNumber,
                items: order.items.map((item: any) => ({
                  name: item.productName,
                  quantity: item.quantity,
                  price: item.unitPrice,
                })),
                subtotal: order.subtotal,
                shipping: order.shipping,
                tax: order.tax,
                total: order.total,
                shippingAddress: order.shippingAddress,
              });
              console.log(`Order confirmation email sent for ${order.orderNumber}`);
            } catch (emailError) {
              console.error("Failed to send order confirmation email:", emailError);
            }
          }
        }
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        // Mark order as cancelled
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "failed",
          status: "cancelled",
        });
        console.log(`Order ${orderId} checkout expired`);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment failed: ${paymentIntent.id}`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

