import { createEmail } from "./base-template";

interface WelcomeEmailProps {
  name: string;
  email: string;
}

export function welcomeEmail({ name, email }: WelcomeEmailProps): string {
  const content = `
    <h2 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center;">
      ¡Bienvenido! 🎉
    </h2>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Hola <strong style="color: #ffffff;">${name}</strong>,
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      ¡Gracias por crear una cuenta en <strong style="color: #f59e0b;">Multi Electric Supply</strong>! 
      Estamos emocionados de tenerte como parte de nuestra familia.
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Ahora puedes disfrutar de:
    </p>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #1a1a2e; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #ffffff;">
            ⚡ <strong>Acceso rápido</strong> a miles de productos eléctricos
          </p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #ffffff;">
            📦 <strong>Seguimiento de pedidos</strong> en tiempo real
          </p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #ffffff;">
            💰 <strong>Precios competitivos</strong> de grado profesional
          </p>
          <p style="margin: 0; font-size: 14px; color: #ffffff;">
            🚚 <strong>Envío gratis</strong> en pedidos de $99+
          </p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'https://multi-tau.vercel.app'}/store/products" 
             style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
            Explorar Productos →
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
      Tu cuenta está registrada con: <strong style="color: #9ca3af;">${email}</strong>
    </p>
  `;

  return createEmail("¡Bienvenido a Multi Electric Supply! Tu cuenta ha sido creada.", content);
}

