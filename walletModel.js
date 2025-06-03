const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  walletNumber: {
    type: String,
    unique: true,
    required: true
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
walletSchema.pre('save', async function(next) {
  if (!this.walletNumber) {
    let isUnique = false;
    let walletNumber;
    
    while (!isUnique) {
      walletNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const existingWallet = await mongoose.model('Wallet').findOne({ walletNumber });
      if (!existingWallet) isUnique = true;
    }
    
    this.walletNumber = walletNumber;
  }
  next();
});

// Virtual for transactions
walletSchema.virtual('transactionHistory', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'wallet'
});

// Instance methods
walletSchema.methods = {
  hasSufficientBalance: function(amount) {
    return this.balance >= amount;
  },
  canWithdraw: function(amount) {
    return this.isActive && this.hasSufficientBalance(amount);
  }
};

// Static methods
walletSchema.statics = {
  findByUser: async function(userId) {
    return await this.findOne({ user: userId });
  }
};

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;