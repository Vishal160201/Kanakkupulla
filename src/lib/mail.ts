import nodemailer from 'nodemailer';

const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${domain}/reset-password?token=${token}`;
  
  // If no SMTP settings are provided, log to console for development
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Kanakkupulla" <noreply@kanakkupulla.com>',
    to: email,
    subject: 'Reset your password - Kanakkupulla',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #0f172a; text-align: center;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 16px;">Hello,</p>
        <p style="color: #475569; font-size: 16px;">We received a request to reset your password for your Kanakkupulla account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #475569; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color: #475569; font-size: 14px;">This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Kanakkupulla Studio Management</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
