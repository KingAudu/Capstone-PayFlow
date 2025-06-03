// Handle transactions between wallets
const Wallet = require('./walletModel');
const Transaction = require('./transactionModel');
const mongoose = require('mongoose');

// Transfer money between wallets
exports.transferFunds = async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { receiverWalletNumber, amount, description } = req.body;

    // Generate a unique reference number
    const reference = `TFR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Validate input
    if (!receiverWalletNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Receiver wallet number and amount are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    // Find sender's wallet
    const senderWallet = await Wallet.findOne({ user: req.user._id }).session(session);
    
    if (!senderWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Sender wallet not found'
      });
    }
    
    // Check if sender has enough balance
    if (senderWallet.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Find receiver's wallet
    const receiverWallet = await Wallet.findOne({ walletNumber: receiverWalletNumber }).session(session);
    
    if (!receiverWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Receiver wallet not found'
      });
    }
    
    // Can't transfer to your own wallet
    if (senderWallet._id.toString() === receiverWallet._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to your own wallet'
      });
    }
    
    // Create transaction
    const transaction = await Transaction.create([{
      type: 'TRANSFER',
      amount,
      currency: senderWallet.currency,
      from: senderWallet._id,
      to: receiverWallet._id,
      description: description || 'Wallet transfer',
      reference,
      status: 'PENDING',
      metadata: {
        senderName: req.user.firstName + ' ' + req.user.lastName,
        receiverWalletNumber
      }
    }], { session });
    
    // Update sender's wallet balance
    senderWallet.balance -= amount;
    await senderWallet.save({ session });
    
    // Update receiver's wallet balance
    receiverWallet.balance += amount;
    await receiverWallet.save({ session });
    
    // Update transaction status to completed
    transaction[0].status = 'COMPLETED';
    await transaction[0].save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({
      success: true,
      message: 'Transfer successful',
      data: {
        transaction: {
          id: transaction[0]._id,
          type: transaction[0].type,
          amount: transaction[0].amount,
          currency: transaction[0].currency,
          reference: transaction[0].reference,
          description: transaction[0].description,
          status: transaction[0].status,
          createdAt: transaction[0].createdAt
        },
        wallet: {
          id: senderWallet._id,
          balance: senderWallet.balance,
          currency: senderWallet.currency
        }
      }
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).json({
      success: false,
      message: 'Error processing transfer',
      error: error.message
    });
  }
};

// Deposit funds into wallet (e.g., from payment gateway)
exports.depositFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { amount, reference, description } = req.body;
    
    // Validate input
    if (!amount || !reference) {
      return res.status(400).json({
        success: false,
        message: 'Amount and reference are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    // Find user's wallet
    const wallet = await Wallet.findOne({ user: req.user._id }).session(session);
    
    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check if transaction with the reference already exists
    const existingTransaction = await Transaction.findOne({ reference }).session(session);
    
    if (existingTransaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Transaction with this reference already exists'
      });
    }
    
    // Create transaction
    const transaction = await Transaction.create([{
      type: 'DEPOSIT',
      amount,
      currency: wallet.currency,
      to: wallet._id,
      description: description || 'Wallet deposit',
      reference,
      status: 'COMPLETED',
      metadata: {
        paymentMethod: req.body.paymentMethod || 'bank',
        depositedBy: req.user.firstName + ' ' + req.user.lastName
      }
    }], { session });
    
    // Update wallet balance
    wallet.balance += amount;
    await wallet.save({ session });
    
    // Add transaction to wallet's transactions array
    wallet.transactions.push(transaction[0]._id);
    await wallet.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({
      success: true,
      message: 'Deposit successful',
      data: {
        transaction: {
          id: transaction[0]._id,
          type: transaction[0].type,
          amount: transaction[0].amount,
          currency: transaction[0].currency,
          reference: transaction[0].reference,
          description: transaction[0].description,
          status: transaction[0].status,
          createdAt: transaction[0].createdAt
        },
        wallet: {
          id: wallet._id,
          balance: wallet.balance,
          currency: wallet.currency
        }
      }
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).json({
      success: false,
      message: 'Error processing deposit',
      error: error.message
    });
  }
};

// Withdraw funds from wallet
exports.withdrawFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { amount, description, withdrawalMethod } = req.body;
    
    // Validate input
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    // Find user's wallet
    const wallet = await Wallet.findOne({ user: req.user._id }).session(session);
    
    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check if user has enough balance
    if (wallet.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Create transaction
    const transaction = await Transaction.create([{
      type: 'WITHDRAWAL',
      amount,
      currency: wallet.currency,
      from: wallet._id,
      description: description || 'Wallet withdrawal',
      status: 'PENDING',
      metadata: {
        withdrawalMethod: withdrawalMethod || 'bank',
        withdrawnBy: req.user.firstName + ' ' + req.user.lastName
      }
    }], { session });
    
    // Update wallet balance
    wallet.balance -= amount;
    await wallet.save({ session });
    
    // Add transaction to wallet's transactions array
    wallet.transactions.push(transaction[0]._id);
    await wallet.save({ session });
    
    // Update transaction status to completed
    transaction[0].status = 'COMPLETED';
    await transaction[0].save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({
      success: true,
      message: 'Withdrawal successful',
      data: {
        transaction: {
          id: transaction[0]._id,
          type: transaction[0].type,
          amount: transaction[0].amount,
          currency: transaction[0].currency,
          reference: transaction[0].reference,
          description: transaction[0].description,
          status: transaction[0].status,
          createdAt: transaction[0].createdAt
        },
        wallet: {
          id: wallet._id,
          balance: wallet.balance,
          currency: wallet.currency
        }
      }
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).json({
      success: false,
      message: 'Error processing withdrawal',
      error: error.message
    });
  }
};