// Transaction schema definition
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP']
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: function() {
      return this.type === 'TRANSFER' || this.type === 'WITHDRAWAL' || this.type === 'PAYMENT';
    }
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: function() {
      return this.type === 'TRANSFER' || this.type === 'DEPOSIT';
    }
  },
  description: {
    type: String,
    trim: true
  },
  reference: {
    type: String,
    unique: true,
  
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
    default: 'PENDING'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique reference before saving
transactionSchema.pre('save', function(next) {
  if (!this.reference) {
    // Generate a unique reference combining timestamp and random string
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 10);
    this.reference = `TXN-${timestamp}-${randomStr}`;
  }
  next();
});

// Index for faster queries
transactionSchema.index({ from: 1, to: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;