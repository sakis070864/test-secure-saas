import nodemailer from 'nodemailer';

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('SMTP credentials not configured. Skipping email send.');
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail(clientEmail: string, targetUrl: string, verifyLink: string) {
  const transporter = createTransporter();
  if (!transporter) return false;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Athan Security" <noreply@sakis-athan.com>',
    to: clientEmail,
    subject: `Unlock Your Deep Security Report: ${targetUrl}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 24px;">Athan Security</h1>
          <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Deep Penetration Security Assessment</p>
        </div>
        
        <h2 style="color: #f1f5f9; font-size: 20px;">Your Report is Ready</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          We've completed a deep security assessment for <strong style="color: #f1f5f9;">${targetUrl}</strong>.
        </p>
        <p style="color: #94a3b8; line-height: 1.6;">
          Click the button below to unlock your full vulnerability report — including exposed files, admin panel detection, cookie security, CORS analysis, and technology fingerprinting.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Unlock Full Report
          </a>
        </div>
        
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #f59e0b; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
            Why is verification required?
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
            Deep penetration reports contain sensitive vulnerability data. We verify your email to ensure only authorized personnel access this information. This link expires in 48 hours.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;">
        <p style="color: #475569; font-size: 11px; text-align: center;">
          Athan Security &bull; sakis-athan.com &bull; This is an automated security assessment
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function sendReportEmail(clientEmail: string, pdfBuffer: Buffer, targetUrl: string) {
  const transporter = createTransporter();
  if (!transporter) return false;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Athan Security" <noreply@sakis-athan.com>',
    to: clientEmail,
    subject: `Deep Security Assessment: ${targetUrl}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #3b82f6; text-align: center;">Athan Security</h1>
        <h2 style="color: #f1f5f9;">Your Deep Security Report</h2>
        <p style="color: #94a3b8;">
          Your comprehensive penetration report for <strong style="color: #f1f5f9;">${targetUrl}</strong> is attached as a PDF.
        </p>
        <hr style="border: none; border-top: 1px solid #1e293b;">
        <p style="color: #475569; font-size: 11px; text-align: center;">Athan Security &bull; sakis-athan.com</p>
      </div>
    `,
    attachments: [{
      filename: `Deep_Security_Audit_${targetUrl.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Report email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending report email:', error);
    throw error;
  }
}
