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
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>

  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Content -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Company Logo -->
                    <img src="https://www.multielectricsupply.com/logo.png" alt="Multi Electric Supply" width="120" height="120" style="display: block; margin: 0 auto 16px; max-width: 120px; height: auto;" />
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">
                      <span style="color: #2563eb;">MULTI</span> <span style="color: #eab308;">ELECTRIC</span> <span style="color: #2563eb;">SUPPLY</span>
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
            <td style="padding: 40px; background-color: #ffffff;">
              ${children}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 16px; font-size: 14px; color: #374151; font-weight: 600;">
                      Multi Electric Supply
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      Av. 65 de Infantería km 7.4, Carolina, PR 00923
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      📞 +1 (787) 963-0569 | ✉️ hzayas@multielectricpr.com
                    </p>
                    <p style="margin: 16px 0 0; font-size: 11px; color: #9ca3af;">
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
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>

  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Company Logo -->
                    <img src="https://www.multielectricsupply.com/logo.png" alt="Multi Electric Supply" width="120" height="120" style="display: block; margin: 0 auto 16px; max-width: 120px; height: auto;" />
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">
                      <span style="color: #2563eb;">MULTI</span> <span style="color: #eab308;">ELECTRIC</span> <span style="color: #2563eb;">SUPPLY</span>
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
            <td style="padding: 40px; background-color: #ffffff;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 16px; font-size: 14px; color: #374151; font-weight: 600;">
                      Multi Electric Supply
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      Av. 65 de Infantería km 7.4, Carolina, PR 00923
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                      📞 +1 (787) 963-0569 | ✉️ hzayas@multielectricpr.com
                    </p>
                    <p style="margin: 16px 0 0; font-size: 11px; color: #9ca3af;">
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

