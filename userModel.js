// Enhanced UserModel.js with additional fields for email-verified password operations
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Email verification fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password reset fields (existing)
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Password reset email verification fields (Step 1 of password reset)
  passwordResetVerificationToken: String,
  passwordResetVerificationExpires: Date,
  
  // Password change email verification fields (Step 1 of password change)
  passwordChangeVerificationToken: String,
  passwordChangeVerificationExpires: Date,
  
  // Password change token fields (Step 2 of password change)
  passwordChangeToken: String,
  passwordChangeExpires: Date
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes for efficient token lookups
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetVerificationToken: 1 });
userSchema.index({ passwordChangeVerificationToken: 1 });
userSchema.index({ passwordChangeToken: 1 });

// Method to clear all password-related tokens (useful for cleanup)
userSchema.methods.clearPasswordTokens = function() {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;
  this.passwordResetVerificationToken = undefined;
  this.passwordResetVerificationExpires = undefined;
  this.passwordChangeVerificationToken = undefined;
  this.passwordChangeVerificationExpires = undefined;
  this.passwordChangeToken = undefined;
  this.passwordChangeExpires = undefined;
};

module.exports = mongoose.model('User', userSchema);