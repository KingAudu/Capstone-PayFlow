// Routes for transaction operations
const express = require('express');
const router = express.Router();
const transactionController = require('./transactionController');
const authController = require('./authController');

// Protect all transaction routes
router.use(authController.protect);

// Transfer funds to another wallet
router.post('/transfer', transactionController.transferFunds);

// Deposit funds into wallet
router.post('/deposit', transactionController.depositFunds);

// Withdraw funds from wallet
router.post('/withdraw', transactionController.withdrawFunds);

module.exports = router;