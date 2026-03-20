interface EmailTemplateProps {
  clientName: string
  amountOwing: number
  daysOverdue: number
  invoiceNumber?: string
  subject: string
  body: string
  language: 'fr' | 'en'
}

export function buildEmailHtml({
  clientName,
  amountOwing,
  daysOverdue,
  invoiceNumber,
  body,
  language,
}: EmailTemplateProps): string {
  const amount = new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amountOwing)

  const paragraphs = body
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin:0 0 14px 0;line-height:1.6;">${line}</p>`)
    .join('\n')

  const overdueColor = daysOverdue > 90 ? '#e53e3e' : daysOverdue > 60 ? '#d69e2e' : '#718096'

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${language === 'fr' ? 'Avis de compte en souffrance' : 'Overdue Account Notice'}</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a6b28,#3fb950);border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:white;font-size:18px;line-height:36px;">&#x1F512;</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:16px;font-weight:700;color:#1a202c;letter-spacing:-0.02em;">BASTION</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

              <!-- Top bar -->
              <tr>
                <td style="background:linear-gradient(135deg,#1a6b28,#3fb950);padding:4px 0;"></td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:32px 36px;">

                  <!-- Amount badge -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>
                      <td style="background:#f8fffe;border:1px solid #c6f6d5;border-radius:8px;padding:16px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <p style="margin:0 0 2px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#718096;">
                                ${language === 'fr' ? 'Montant en souffrance' : 'Amount overdue'}
                              </p>
                              <p style="margin:0;font-size:28px;font-weight:800;color:#1a202c;letter-spacing:-0.03em;">${amount}</p>
                            </td>
                            <td align="right">
                              <span style="display:inline-block;background:${overdueColor}18;border:1px solid ${overdueColor}40;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;color:${overdueColor};">
                                ${daysOverdue} ${language === 'fr' ? 'jours' : 'days'}
                              </span>
                              ${invoiceNumber ? `<p style="margin:6px 0 0 0;font-size:11px;color:#a0aec0;text-align:right;"># ${invoiceNumber}</p>` : ''}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Body text -->
                  <div style="color:#2d3748;font-size:14px;">
                    ${paragraphs}
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f7f8fa;border-top:1px solid #e2e8f0;padding:16px 36px;">
                  <p style="margin:0;font-size:11px;color:#a0aec0;line-height:1.5;">
                    ${language === 'fr'
      ? `Ce message a été envoyé à <strong>${clientName}</strong>. Si vous avez déjà réglé ce montant, veuillez ignorer ce message.`
      : `This message was sent to <strong>${clientName}</strong>. If you have already settled this amount, please disregard this message.`}
                  </p>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a0aec0;">
                Propulsé par <strong>BASTION</strong> · ${language === 'fr' ? 'Données hébergées au Canada · Conforme Loi 25 / PIPEDA' : 'Data hosted in Canada · Compliant with PIPEDA'}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
