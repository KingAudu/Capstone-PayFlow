// Enhanced email service with verification emails for password operations
const nodemailer = require('nodemailer');
const config = require('./config');

// Create transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS
    }
  });
};

// Send email verification email (for new user registration)
const sendVerificationEmail = async (email, verificationToken, req) => {
  try {
    const transporter = createTransporter();
    
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
    
    const mailOptions = {
      from: `"PayFlow" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome! Please verify your email</h2>
          <p>Thank you for registering with us. To complete your registration, please verify your email address.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully');
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email verification (Step 1 of password reset)
const sendPasswordResetVerificationEmail = async (email, verificationToken, req) => {
  try {
    const transporter = createTransporter();
    
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-reset-email/${verificationToken}`;
    
    const mailOptions = {
      from: `"PayFlow" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset - Email Verification Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password. For security reasons, we need to verify your email address first.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email for Password Reset
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          <p><strong>This verification link will expire in 1 hour.</strong></p>
          <p>After verifying your email, you will receive another email with the actual password reset link.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset verification email sent successfully');
    
  } catch (error) {
    console.error('Error sending password reset verification email:', error);
    throw new Error('Failed to send password reset verification email');
  }
};

// Send actual password reset email (Step 2 of password reset - after email verification)
const sendPasswordResetEmail = async (email, resetToken, req) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: `"PayFlow" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Your email has been verified. You can now reset your password using the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>This link will expire in 30 minutes.</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully');
    
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send password change email verification (Step 1 of password change)
const sendPasswordChangeVerificationEmail = async (email, verificationToken, req) => {
  try {
    const transporter = createTransporter();
    
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-change-email/${verificationToken}`;
    
    const mailOptions = {
      from: `"PayFlow" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Password Change - Email Verification Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Change Request</h2>
          <p>You have requested to change your password. For security reasons, we need to verify your email address first.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #ffc107; color: #212529; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email for Password Change
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          <p><strong>This verification link will expire in 1 hour.</strong></p>
          <p>After verifying your email, you will be able to set your new password.</p>
          <p>If you didn't request this password change, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Password change verification email sent successfully');
    
  } catch (error) {
    console.error('Error sending password change verification email:', error);
    throw new Error('Failed to send password change verification email');
  }
};

// Send password change notification (after successful password change)
const sendPasswordChangeNotification = async (email, userName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"PayFlow" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Changed</h2>
          <p>Hello ${userName},</p>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #495057; font-size: 14px;">
              <strong>Security Tip:</strong> If this wasn't you, someone else may have access to your account. 
              Please contact support immediately.
            </p>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Password change notification sent successfully');
    
  } catch (error) {
    console.error('Error sending password change notification:', error);
    // Don't throw error here as it's just a notification
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangeVerificationEmail,
  sendPasswordChangeNotification
};