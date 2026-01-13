import { getResend, FROM_EMAIL } from "./resend";
import {
  welcomeEmail,
  resetPasswordEmail,
  orderConfirmationEmail,
  orderStatusEmail,
  teamWelcomeEmail,
} from "@/emails";

// Send Welcome Email to new customers
export async function sendWelcomeEmail(to: string, name: string) {
  try {
    const resend = getResend();
    const html = welcomeEmail({ name, email: to });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "¡Bienvenido a Multi Electric Supply! 🎉",
      html,
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error };
    }

    console.log("Welcome email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error };
  }
}

// Send Password Reset Email
export async function sendPasswordResetEmail(to: string, name: string, resetLink: string) {
  try {
    const resend = getResend();
    const html = resetPasswordEmail({ name, resetLink });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Restablecer Contraseña - Multi Electric Supply 🔐",
      html,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error };
    }

    console.log("Password reset email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error };
  }
}

// Send Order Confirmation Email
interface OrderConfirmationParams {
  to: string;
  customerName: string;
  orderNumber: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export async function sendOrderConfirmationEmail(params: OrderConfirmationParams) {
  try {
    const resend = getResend();
    const html = orderConfirmationEmail({
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      items: params.items,
      subtotal: params.subtotal,
      shipping: params.shipping,
      tax: params.tax,
      total: params.total,
      shippingAddress: params.shippingAddress,
    });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `¡Pedido #${params.orderNumber} Confirmado! ✅`,
      html,
    });

    if (error) {
      console.error("Failed to send order confirmation email:", error);
      return { success: false, error };
    }

    console.log("Order confirmation email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return { success: false, error };
  }
}

// Send Order Status Update Email
interface OrderStatusParams {
  to: string;
  customerName: string;
  orderNumber: string;
  status: "processing" | "ready_for_pickup" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export async function sendOrderStatusEmail(params: OrderStatusParams) {
  try {
    const resend = getResend();
    const html = orderStatusEmail({
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      status: params.status,
      trackingNumber: params.trackingNumber,
      estimatedDelivery: params.estimatedDelivery,
    });

    const statusSubjects = {
      processing: "⏳ Tu pedido está siendo procesado",
      ready_for_pickup: "📦 ¡Tu pedido está listo para recoger!",
      shipped: "🚚 ¡Tu pedido ha sido enviado!",
      delivered: "✅ ¡Tu pedido ha sido entregado!",
      cancelled: "❌ Pedido cancelado",
    };

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `${statusSubjects[params.status]} - Pedido #${params.orderNumber}`,
      html,
    });

    if (error) {
      console.error("Failed to send order status email:", error);
      return { success: false, error };
    }

    console.log("Order status email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending order status email:", error);
    return { success: false, error };
  }
}

// Send Team Member Welcome Email
export async function sendTeamWelcomeEmail(
  to: string,
  name: string,
  role: string,
  temporaryPassword?: string
) {
  try {
    const resend = getResend();
    const html = teamWelcomeEmail({ name, email: to, role, temporaryPassword });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "¡Bienvenido al equipo de Multi Electric Supply! 🎉",
      html,
    });

    if (error) {
      console.error("Failed to send team welcome email:", error);
      return { success: false, error };
    }

    console.log("Team welcome email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending team welcome email:", error);
    return { success: false, error };
  }
}

