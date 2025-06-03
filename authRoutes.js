// Enhanced authentication routes with email verification for password operations
const express = require('express');
const authController = require('./authController');

const router = express.Router();

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Enhanced password reset flow (3 steps)
router.post('/forgot-password', authController.forgotPassword); // Step 1: Request reset (sends email verification)
router.get('/verify-reset-email/:token', authController.verifyPasswordResetEmail); // Step 2: Verify email (generates reset token)
router.patch('/reset-password/:token', authController.resetPassword); // Step 3: Actually reset password

// Email verification routes
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification-email', authController.resendVerificationEmail);

// Protected routes (require authentication)
router.use(authController.protect); // All routes after this middleware are protected

// Enhanced password change flow (3 steps) - requires authentication
router.post('/request-password-change', authController.requestPasswordChange); // Step 1: Request change (sends email verification)
router.get('/verify-change-email/:token', authController.verifyPasswordChangeEmail); // Step 2: Verify email (generates change token)
router.patch('/change-password', authController.changePassword); // Step 3: Actually change password

// User management routes
router.get('/users/:id', authController.getUserById);
router.get('/users/email/:email', authController.getUserByEmail);

// Admin only routes
router.post('/create-admin', authController.restrictTo('admin'), authController.createAdmin);
router.get('/users', authController.restrictTo('admin'), authController.getAllUsers);

module.exports = router;