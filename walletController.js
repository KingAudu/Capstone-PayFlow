// Wallet management controller
const Wallet = require('./walletModel');
const User = require('./userModel');
const Transaction = require('./transactionModel');

// Get wallet details
exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: wallet._id,
        walletNumber: wallet.walletNumber,
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving wallet',
      error: error.message
    });
  }
};

// Get wallet transaction history
exports.getTransactions = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filters
    const filter = { 
      $or: [
        { from: wallet._id },
        { to: wallet._id }
      ]
    };
    
    // Add date filters if provided
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Add transaction type filter if provided
    if (req.query.type) {
      filter.type = req.query.type.toUpperCase();
    }
    
    // Get transactions where wallet is either sender or receiver
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Transaction.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: transactions.map(transaction => ({
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        description: transaction.description,
        status: transaction.status,
        isOutgoing: transaction.from && transaction.from.toString() === wallet._id.toString(),
        createdAt: transaction.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving transactions',
      error: error.message
    });
  }
};

// Create wallet (if needed manually)
exports.createWallet = async (req, res) => {
  try {
    // Check if user already has a wallet
    const existingWallet = await Wallet.findOne({ user: req.user._id });
    
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'User already has a wallet'
      });
    }
    
    // Create new wallet
    const wallet = await Wallet.create({
      user: req.user._id,
      currency: req.body.currency || 'NGN',
      walletNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString()
    });
    
    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      data: {
        id: wallet._id,
        walletNumber: wallet.walletNumber,
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
        createdAt: wallet.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating wallet',
      error: error.message
    });
  }
};

// Check wallet balance
exports.checkBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        walletNumber: wallet.walletNumber
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking balance',
      error: error.message
    });
  }
};

// Find wallet by wallet number (for transfers)
exports.findWallet = async (req, res) => {
  try {
    const { walletNumber } = req.params;
    
    if (!walletNumber) {
      return res.status(400).json({
        success: false,
        message: 'Wallet number is required'
      });
    }
    
    const wallet = await Wallet.findOne({ walletNumber }).populate('user', 'firstName lastName');
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Don't return user's own wallet
    if (wallet.user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to your own wallet'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        walletNumber: wallet.walletNumber,
        userName: `${wallet.user.firstName} ${wallet.user.lastName}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finding wallet',
      error: error.message
    });
  }
};