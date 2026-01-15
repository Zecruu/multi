import { createEmail } from "./base-template";

interface PasswordChangedEmailProps {
  name: string;
}

export function passwordChangedEmail({ name }: PasswordChangedEmailProps): string {
  const content = `
    <h2 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center;">
      Contraseña Actualizada 🔐
    </h2>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Hola <strong style="color: #ffffff;">${name}</strong>,
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Te confirmamos que la contraseña de tu cuenta en 
      <strong style="color: #f59e0b;">Multi Electric Supply</strong> ha sido cambiada exitosamente.
    </p>
    
    <div style="background-color: #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: bold; color: #ef4444;">
        ⚠️ ¿No fuiste tú?
      </p>
      <p style="margin: 0; font-size: 14px; color: #d1d5db; line-height: 1.6;">
        Si no realizaste este cambio, por favor contacta inmediatamente a tu administrador 
        o llámanos al <strong style="color: #ffffff;">+1 (787) 963-0569</strong> para asegurar tu cuenta.
      </p>
    </div>
    
    <p style="margin: 24px 0; font-size: 14px; color: #6b7280; text-align: center;">
      Este cambio fue realizado el ${new Date().toLocaleDateString('es-PR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}.
    </p>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'https://multi-tau.vercel.app'}/admin/login" 
             style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
            Iniciar Sesión →
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
      Si tienes preguntas, no dudes en contactarnos.
    </p>
  `;

  return createEmail("Tu contraseña ha sido actualizada exitosamente.", content);
}

