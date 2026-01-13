import { createEmail } from "./base-template";

interface TeamWelcomeEmailProps {
  name: string;
  email: string;
  role: string;
  temporaryPassword?: string;
}

export function teamWelcomeEmail({ name, email, role, temporaryPassword }: TeamWelcomeEmailProps): string {
  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    manager: "Gerente",
    staff: "Empleado",
  };

  const content = `
    <h2 style="margin: 0 0 24px; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center;">
      ¡Bienvenido al Equipo! 🎉
    </h2>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Hola <strong style="color: #ffffff;">${name}</strong>,
    </p>
    
    <p style="margin: 0 0 16px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      ¡Nos complace darte la bienvenida al equipo de <strong style="color: #f59e0b;">Multi Electric Supply</strong>! 
      Tu cuenta ha sido creada exitosamente.
    </p>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="padding: 20px; background-color: #1a1a2e; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 12px; font-size: 16px; font-weight: bold; color: #ffffff;">📋 Información de tu Cuenta</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Correo:</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #ffffff;">${email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Rol:</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #f59e0b; font-weight: bold;">${roleLabels[role] || role}</p>
              </td>
            </tr>
            ${
              temporaryPassword
                ? `
            <tr>
              <td style="padding: 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">Contraseña Temporal:</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #22c55e; font-family: monospace; background-color: #0a0a0a; padding: 8px 12px; border-radius: 4px; display: inline-block;">${temporaryPassword}</p>
              </td>
            </tr>
            `
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
    
    ${
      temporaryPassword
        ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #7f1d1d20; border-radius: 8px; border-left: 4px solid #ef4444;">
          <p style="margin: 0; font-size: 14px; color: #fca5a5;">
            ⚠️ <strong>Importante:</strong> Por seguridad, cambia tu contraseña después de iniciar sesión por primera vez.
          </p>
        </td>
      </tr>
    </table>
    `
        : ""
    }
    
    <p style="margin: 0 0 24px; font-size: 16px; color: #d1d5db; line-height: 1.6;">
      Como parte del equipo, tendrás acceso al panel de administración donde podrás:
    </p>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #1a1a2e; border-radius: 8px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #ffffff;">
            📦 Gestionar productos e inventario
          </p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #ffffff;">
            🛒 Procesar y rastrear pedidos
          </p>
          <p style="margin: 0 0 8px; font-size: 14px; color: #ffffff;">
            👥 Administrar clientes
          </p>
          <p style="margin: 0; font-size: 14px; color: #ffffff;">
            📊 Ver reportes y estadísticas
          </p>
        </td>
      </tr>
    </table>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0;">
          <a href="${process.env.NEXTAUTH_URL || 'https://multi-tau.vercel.app'}/admin/login" 
             style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
            Acceder al Panel Admin →
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
      ¿Necesitas ayuda? Contacta al administrador del sistema.
    </p>
  `;

  return createEmail(`¡Bienvenido al equipo de Multi Electric Supply!`, content);
}

