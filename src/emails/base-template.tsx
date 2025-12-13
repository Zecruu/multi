import * as React from "react";

interface BaseTemplateProps {
  previewText: string;
  children: React.ReactNode;
}

export function BaseTemplate({ previewText, children }: BaseTemplateProps) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Multi Electric Supply</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>
  
  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Content -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #141414; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid #262626;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Logo Circle -->
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); text-align: center; vertical-align: middle;">
                            <span style="font-size: 28px; font-weight: bold; color: #ffffff;">⚡</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">
                      MULTI <span style="color: #f59e0b;">ELECTRIC</span> SUPPLY
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px;">
                      Electric and Lighting Supplier's
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Email Content -->
          <tr>
            <td style="padding: 40px;">
              ${children}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 32px 40px; border-top: 1px solid #262626;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 16px; font-size: 14px; color: #9ca3af;">
                      Multi Electric Supply
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      Av. 65 de Infantería km 7.4, Carolina, PR 00923
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      📞 +1 (787) 963-0569 | ✉️ hzayas@multielectricpr.com
                    </p>
                    <p style="margin: 16px 0 0; font-size: 11px; color: #4b5563;">
                      © ${new Date().getFullYear()} Multi Electric Supply. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Helper function to wrap content in base template
export function createEmail(previewText: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Multi Electric Supply</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>
  
  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #141414; border-radius: 16px; overflow: hidden; border: 1px solid #262626;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid #262626;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); text-align: center; vertical-align: middle;">
                          <span style="font-size: 28px; font-weight: bold; color: #ffffff;">⚡</span>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin: 16px 0 0; font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">
                      MULTI <span style="color: #f59e0b;">ELECTRIC</span> SUPPLY
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 2px;">
                      Electric and Lighting Supplier's
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 32px 40px; border-top: 1px solid #262626;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 16px; font-size: 14px; color: #9ca3af;">
                      Multi Electric Supply
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      Av. 65 de Infantería km 7.4, Carolina, PR 00923
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      📞 +1 (787) 963-0569 | ✉️ hzayas@multielectricpr.com
                    </p>
                    <p style="margin: 16px 0 0; font-size: 11px; color: #4b5563;">
                      © ${new Date().getFullYear()} Multi Electric Supply. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

