import { createEmail } from "./base-template";

interface OrderStatusEmailProps {
  customerName: string;
  orderNumber: string;
  status: "processing" | "ready_for_pickup" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string;
  estimatedDelivery?: string;
}

const statusConfig = {
  processing: {
    emoji: "⏳",
    title: "Pedido en Proceso",
    message: "Tu pedido está siendo preparado por nuestro equipo.",
    color: "#f59e0b",
  },
  ready_for_pickup: {
    emoji: "📦",
    title: "¡Listo para Recoger!",
    message: "Tu pedido está listo para ser recogido en nuestra tienda.",
    color: "#22c55e",
  },
  shipped: {
    emoji: "🚚",
    title: "¡Pedido Enviado!",
    message: "Tu pedido ha sido enviado y está en camino.",
    color: "#3b82f6",
  },
  delivered: {
    emoji: "✅",
    title: "¡Pedido Entregado!",
    message: "Tu pedido ha sido entregado exitosamente.",
    color: "#22c55e",
  },
  cancelled: {
    emoji: "❌",
    title: "Pedido Cancelado",
    message: "Tu pedido ha sido cancelado. Si tienes preguntas, contáctanos.",
    color: "#ef4444",
  },
};

export function orderStatusEmail({
  customerName,
  orderNumber,
  status,
  trackingNumber,
  estimatedDelivery,
}: OrderStatusEmailProps): string {
  const config = statusConfig[status];

  const trackingSection = trackingNumber
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #1a1a2e; border-radius: 8px; border-left: 4px solid ${config.color};">
          <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">Número de Rastreo:</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #ffffff;">${trackingNumber}</p>
          ${estimatedDelivery ? `<p style="margin: 8px 0 0; font-size: 14px; color: #9ca3af;">Entrega estimada: ${estimatedDelivery}</p>` : ""}
        </td>
      </tr>
    </table>
  `
    : "";

  const pickupSection =
    status === "ready_for_pickup"
      ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #1a1a2e; border-radius: 8px; border-left: 4px solid #22c55e;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: bold; color: #ffffff;">📍 Ubicación de Recogida</p>
          <p style="margin: 0; font-size: 14px; color: #d1d5db; line-height: 1.6;">
            Multi Electric Supply<br>
            Av. 65 de Infantería km 7.4<br>
            Carolina, PR 00923
          </p>
          <p style="margin: 12px 0 0; font-size: 14px; color: #f59e0b;">
            🕐 Horario: Lun-Vie 8:00 AM - 5:00 PM
          </p>
        </td>
      </tr>
    </table>
  `
      : "";

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 80px; height: 80px; margin: 0 auto 16px; border-radius: 50%; background-color: ${config.color}20; display: flex; align-items: center; justify-content: center;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 80px; height: 80px; border-radius: 50%; background-color: ${config.color}20; text-align: center; vertical-align: middle;">
              <span style="font-size: 36px;">${config.emoji}</span>
            </td>
          </tr>
        </table>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: bold; color: #ffffff;">
        ${config.title}
      </h2>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Pedido #${orderNumber}
      </p>
    </div>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Hola <strong style="color: #ffffff;">${customerName}</strong>,
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      ${config.message}
    </p>
    
    ${trackingSection}
    ${pickupSection}
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'https://multi-tau.vercel.app'}/store/orders" 
             style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
            Ver Detalles del Pedido →
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
      ¿Tienes preguntas? Contáctanos al <strong style="color: #9ca3af;">+1 (787) 963-0569</strong>
    </p>
  `;

  return createEmail(`${config.emoji} ${config.title} - Pedido #${orderNumber}`, content);
}

