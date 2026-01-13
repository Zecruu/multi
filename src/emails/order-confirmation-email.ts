import { createEmail } from "./base-template";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  items: OrderItem[];
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

export function orderConfirmationEmail({
  customerName,
  orderNumber,
  items,
  subtotal,
  shipping,
  tax,
  total,
  shippingAddress,
}: OrderConfirmationEmailProps): string {
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
          <p style="margin: 0; font-size: 14px; color: #ffffff;">${item.name}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Cantidad: ${item.quantity}</p>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #262626; text-align: right;">
          <p style="margin: 0; font-size: 14px; color: #ffffff;">$${(item.price * item.quantity).toFixed(2)}</p>
        </td>
      </tr>
    `
    )
    .join("");

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center;">
      ¡Pedido Confirmado! ✅
    </h2>
    
    <p style="margin: 0 0 32px; font-size: 14px; color: #6b7280; text-align: center;">
      Pedido #${orderNumber}
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Hola <strong style="color: #ffffff;">${customerName}</strong>,
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      ¡Gracias por tu compra! Hemos recibido tu pedido y estamos procesándolo.
    </p>
    
    <!-- Order Items -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; background-color: #1a1a2e; border-radius: 8px; padding: 16px;">
      <tr>
        <td colspan="2" style="padding-bottom: 12px; border-bottom: 1px solid #262626;">
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #ffffff;">📦 Resumen del Pedido</p>
        </td>
      </tr>
      ${itemsHtml}
      <tr>
        <td style="padding: 12px 0 4px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Subtotal</p>
        </td>
        <td style="padding: 12px 0 4px; text-align: right;">
          <p style="margin: 0; font-size: 14px; color: #9ca3af;">$${subtotal.toFixed(2)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Envío</p>
        </td>
        <td style="padding: 4px 0; text-align: right;">
          <p style="margin: 0; font-size: 14px; color: #9ca3af;">${shipping === 0 ? "GRATIS" : `$${shipping.toFixed(2)}`}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Impuesto</p>
        </td>
        <td style="padding: 4px 0; text-align: right;">
          <p style="margin: 0; font-size: 14px; color: #9ca3af;">$${tax.toFixed(2)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 0 0; border-top: 1px solid #262626;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #ffffff;">Total</p>
        </td>
        <td style="padding: 16px 0 0; border-top: 1px solid #262626; text-align: right;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #22c55e;">$${total.toFixed(2)}</p>
        </td>
      </tr>
    </table>
    
    <!-- Shipping Address -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #1a1a2e; border-radius: 8px;">
          <p style="margin: 0 0 12px; font-size: 16px; font-weight: bold; color: #ffffff;">📍 Dirección de Envío</p>
          <p style="margin: 0; font-size: 14px; color: #d1d5db; line-height: 1.6;">
            ${customerName}<br>
            ${shippingAddress.street}<br>
            ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
            ${shippingAddress.country}
          </p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'https://multi-tau.vercel.app'}/store/orders" 
             style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
            Ver Mi Pedido →
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
      Te notificaremos cuando tu pedido esté listo para recoger o sea enviado.
    </p>
  `;

  return createEmail(`¡Pedido #${orderNumber} confirmado! Gracias por tu compra.`, content);
}

