// User authentication controller with mandatory email verification for password operations
const User = require('./userModel');
const Wallet = require('./walletModel');
const jwt = require('jsonwebtoken');
const config = require('./config');
const crypto = require('crypto');
const { 
  sendPasswordResetEmail, 
  sendVerificationEmail, 
  sendPasswordChangeNotification,
  sendPasswordChangeVerificationEmail,
  sendPasswordResetVerificationEmail 
} = require('./emailService');

// Create JWT token
const createToken = (id) => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRY
  });
};

// Register new user (with email verification)
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Create new user (initially unverified)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      emailVerified: false
    });

    // Create wallet for the user
    const wallet = await Wallet.create({
      user: user._id,
      walletNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString()
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken, req);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    // Generate token (but user should verify email to access most features)
    const token = createToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified
        },
        wallet: {
          id: wallet._id,
          walletNumber: wallet.walletNumber,
          balance: wallet.balance,
          currency: wallet.currency
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash token and find user
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
      error: error.message
    });
  }
};

// Resend verification email
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const hashedVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    user.emailVerificationToken = hashedVerificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, req);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending verification email',
      error: error.message
    });
  }
};

// Login user (check email verification)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists and explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address before logging in',
        needsEmailVerification: true
      });
    }

    // Find user's wallet
    const wallet = await Wallet.findOne({ user: user._id });

    // Generate token
    const token = createToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified
        },
        wallet: {
          id: wallet._id,
          walletNumber: wallet.walletNumber,
          balance: wallet.balance,
          currency: wallet.currency
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// STEP 1: Request password reset (sends email verification first)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account with that email exists'
      });
    }

    // 2. Generate password reset verification token (different from actual reset token)
    const resetVerificationToken = crypto.randomBytes(20).toString('hex');
    user.passwordResetVerificationToken = crypto
      .createHash('sha256')
      .update(resetVerificationToken)
      .digest('hex');
    user.passwordResetVerificationExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // 3. Send email verification for password reset
    try {
      await sendPasswordResetVerificationEmail(user.email, resetVerificationToken, req);
      
      res.status(200).json({
        success: true,
        message: 'Password reset verification email sent. Please check your email and click the verification link.'
      });
    } catch (emailError) {
      // If email fails, clear the verification token
      user.passwordResetVerificationToken = undefined;
      user.passwordResetVerificationExpires = undefined;
      await user.save();

      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset verification email. Please try again.'
      });
    }
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request',
      error: error.message
    });
  }
};

// STEP 2: Verify email for password reset (generates actual reset token)
exports.verifyPasswordResetEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash token and find user
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetVerificationToken: hashedToken,
      passwordResetVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Generate actual password reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 1800000; // 30 minutes (shorter window after verification)
    
    // Clear verification token
    user.passwordResetVerificationToken = undefined;
    user.passwordResetVerificationExpires = undefined;

    await user.save();

    // Send the actual password reset email with reset link
    try {
      await sendPasswordResetEmail(user.email, resetToken, req);
      
      res.status(200).json({
        success: true,
        message: 'Email verified successfully. Password reset link has been sent to your email.'
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Email verified but failed to send password reset link. Please try again.'
      });
    }

  } catch (error) {
    console.error('Verify password reset email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying password reset email',
      error: error.message
    });
  }
};

// STEP 3: Reset password (requires prior email verification)
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // 1. Hash token and find user
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // 2. Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // 3. Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    // 4. Send password change notification
    try {
      await sendPasswordChangeNotification(user.email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send password change notification:', emailError);
      // Continue even if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

// STEP 1: Request password change (sends email verification first)
exports.requestPasswordChange = async (req, res) => {
  try {
    const { currentPassword } = req.body;

    // Validate input
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your current password'
      });
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Generate password change verification token
    const changeVerificationToken = crypto.randomBytes(20).toString('hex');
    user.passwordChangeVerificationToken = crypto
      .createHash('sha256')
      .update(changeVerificationToken)
      .digest('hex');
    user.passwordChangeVerificationExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Send email verification for password change
    try {
      await sendPasswordChangeVerificationEmail(user.email, changeVerificationToken, req);
      
      res.status(200).json({
        success: true,
        message: 'Password change verification email sent. Please check your email and click the verification link.'
      });
    } catch (emailError) {
      // If email fails, clear the verification token
      user.passwordChangeVerificationToken = undefined;
      user.passwordChangeVerificationExpires = undefined;
      await user.save();

      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password change verification email. Please try again.'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error requesting password change',
      error: error.message
    });
  }
};

// STEP 2: Verify email for password change (generates change token)
exports.verifyPasswordChangeEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash token and find user
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordChangeVerificationToken: hashedToken,
      passwordChangeVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Generate actual password change token
    const changeToken = crypto.randomBytes(20).toString('hex');
    user.passwordChangeToken = crypto
      .createHash('sha256')
      .update(changeToken)
      .digest('hex');
    user.passwordChangeExpires = Date.now() + 1800000; // 30 minutes
    
    // Clear verification token
    user.passwordChangeVerificationToken = undefined;
    user.passwordChangeVerificationExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now proceed to change your password.',
      changeToken: changeToken // Send this token to frontend for the final password change
    });

  } catch (error) {
    console.error('Verify password change email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying password change email',
      error: error.message
    });
  }
};

// STEP 3: Change password (requires email verification token)
exports.changePassword = async (req, res) => {
  try {
    const { newPassword, changeToken } = req.body;

    // Validate input
    if (!newPassword || !changeToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide new password and change token'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Hash token and find user
    const hashedToken = crypto
      .createHash('sha256')
      .update(changeToken)
      .digest('hex');

    const user = await User.findOne({
      passwordChangeToken: hashedToken,
      passwordChangeExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired change token. Please request password change again.'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordChangeToken = undefined;
    user.passwordChangeExpires = undefined;
    await user.save();

    // Send password change notification
    try {
      await sendPasswordChangeNotification(user.email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send password change notification:', emailError);
      // Continue even if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// Create Admin Account
exports.createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      role: 'admin',
      emailVerified: true // Auto-verify admin accounts
    });

    const wallet = await Wallet.create({
      user: user._id,
      walletNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString()
    });

    const token = createToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

// Get All-Users by ADMIN
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -passwordChangeVerificationToken -passwordResetVerificationToken -passwordChangeToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userIds = users.map(user => user._id);
    const wallets = await Wallet.find({ user: { $in: userIds } });

    const walletMap = {};
    wallets.forEach(wallet => {
      walletMap[wallet.user.toString()] = {
        id: wallet._id,
        walletNumber: wallet.walletNumber,
        balance: wallet.balance,
        currency: wallet.currency
      };
    });

    const usersWithWallets = users.map(user => ({
      ...user.toObject(),
      wallet: walletMap[user._id.toString()] || null
    }));

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: usersWithWallets,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: error.message
    });
  }
};

// GET ALL-USER BY THEIR ID BY THE ADMIN
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findById(id)
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -passwordChangeVerificationToken -passwordResetVerificationToken -passwordChangeToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ user: user._id });

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        wallet: wallet ? {
          id: wallet._id,
          walletNumber: wallet.walletNumber,
          balance: wallet.balance,
          currency: wallet.currency
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user',
      error: error.message
    });
  }
};

// GET ALL-USERS BY THEIR EMAIL BY ADMIN
exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (req.user.role !== 'admin' && req.user.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -passwordChangeVerificationToken -passwordResetVerificationToken -passwordChangeToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const wallet = await Wallet.findOne({ user: user._id });

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        wallet: wallet ? {
          id: wallet._id,
          walletNumber: wallet.walletNumber,
          balance: wallet.balance,
          currency: wallet.currency
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user',
      error: error.message
    });
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message
    });
  }
};