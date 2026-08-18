const express = require('express');
const router = express.Router();
const { createCheckoutSession, createDirectCheckoutSession, handleMockSuccess, handleWebhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Define Payment Routes
router.post('/checkout-session/:offerId', protect, createCheckoutSession);
router.post('/direct-checkout/:listingId', protect, createDirectCheckoutSession);
router.get('/mock-success', handleMockSuccess);

// Use route-specific raw body parser for Stripe signature checks
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
