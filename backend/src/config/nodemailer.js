const nodemailer = require('nodemailer');

const sendOTPEmail = async (email, otp) => {
  // Check if SMTP configurations are present. If not, log to console as development fallback.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n==================================================');
    console.log(`[DEVELOPMENT MODE] OTP for ${email}: ${otp}`);
    console.log('==================================================\n');
    return { success: true, mode: 'console' };
  }

  try {
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
      from: `"CampusCart" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'CampusCart Login Verification Code',
      text: `Your CampusCart OTP verification code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">CampusCart Verification</h2>
          <p>Hello student,</p>
          <p>Thank you for using CampusCart. To verify your email and access the marketplace, please enter the following 6-digit One-Time Password (OTP):</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="text-align: center; font-size: 12px; color: #9ca3af;">CampusCart - College Peer-to-Peer Marketplace</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, mode: 'email' };
  } catch (error) {
    console.error('Nodemailer error:', error);
    // Fallback to console if SMTP fails
    console.log('\n==================================================');
    console.log(`[SMTP FAIL FALLBACK] OTP for ${email}: ${otp}`);
    console.log('==================================================\n');
    return { success: true, mode: 'fallback-console', error: error.message };
  }
};

module.exports = { sendOTPEmail };
