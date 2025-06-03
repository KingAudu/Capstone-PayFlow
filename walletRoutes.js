// Wallet routes
const express = require('express');
const router = express.Router();
const walletController = require('./walletController');
const authController = require('./authController');

// Protect all wallet routes
router.use(authController.protect);

// Get wallet details
router.get('/', walletController.getWallet);

// Get wallet transactions
router.get('/transactions', walletController.getTransactions);

// Check wallet balance
router.get('/balance', walletController.checkBalance);

// Find wallet by number (for transfers)
router.get('/find/:walletNumber', walletController.findWallet);

// Create wallet (if needed manually)
router.post('/', walletController.createWallet);

module.exports = router; 