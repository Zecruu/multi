import { createEmail } from "./base-template";

interface ResetPasswordEmailProps {
  name: string;
  resetLink: string;
}

export function resetPasswordEmail({ name, resetLink }: ResetPasswordEmailProps): string {
  const content = `
    <h2 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center;">
      Restablecer Contraseña 🔐
    </h2>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Hola <strong style="color: #ffffff;">${name}</strong>,
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en 
      <strong style="color: #f59e0b;">Multi Electric Supply</strong>.
    </p>
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Haz clic en el botón de abajo para crear una nueva contraseña:
    </p>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <a href="${resetLink}" 
             style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
            Restablecer Contraseña
          </a>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #1a1a2e; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 14px; color: #fbbf24;">
            ⚠️ <strong>Importante:</strong> Este enlace expirará en 1 hora por seguridad.
          </p>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280; line-height: 1.6;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    
    <p style="margin: 0 0 24px; font-size: 12px; color: #3b82f6; word-break: break-all; background-color: #1a1a2e; padding: 12px; border-radius: 8px;">
      ${resetLink}
    </p>
    
    <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
      Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá igual.
    </p>
  `;

  return createEmail("Restablece tu contraseña en Multi Electric Supply", content);
}

