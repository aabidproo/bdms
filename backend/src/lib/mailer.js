const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (to, resetToken) => {
  const resetLink = `${process.env.CLIENT_URL}?token=${resetToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f9fafb; color: #111827; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-top: 4px solid #b11e28; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 800; color: #b11e28; margin: 0; letter-spacing: -0.025em; }
        .title { font-size: 20px; font-weight: 700; color: #111827; margin-top: 20px; }
        .text { font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
        .button-wrapper { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background-color: #b11e28; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .warning { font-size: 13px; color: #9ca3af; margin-top: 30px; text-align: center; }
        .divider { height: 1px; background-color: #e5e7eb; margin: 30px 0; }
        .url-fallback { font-size: 12px; color: #6b7280; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <h1 class="logo">LifeLink</h1>
            <h2 class="title">Password Reset Request</h2>
          </div>
          
          <p class="text">Hello,</p>
          <p class="text">We received a request to reset your password for your LifeLink account. You can reset your password by clicking the button below:</p>
          
          <div class="button-wrapper">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          
          <p class="text"><strong>Note:</strong> This link is only valid for 1 hour.</p>
          
          <div class="divider"></div>
          
          <p class="warning">If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
          
          <p class="url-fallback">
            If you're having trouble clicking the button, copy and paste the URL below into your web browser:<br>
            <a href="${resetLink}" style="color: #4f46e5;">${resetLink}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"LifeLink Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'LifeLink - Reset Your Password',
    html: htmlContent,
  });
};

module.exports = { sendPasswordResetEmail };
