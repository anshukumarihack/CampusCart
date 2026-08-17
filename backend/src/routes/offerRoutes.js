const express = require('express');
const router = express.Router();
const { 
  createOffer, 
  respondToOffer,
  getOffersReceived,
  getOffersSent,
  counterOffer
} = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createOffer);
router.get('/received', protect, getOffersReceived);
router.get('/sent', protect, getOffersSent);
router.post('/:id/respond', protect, respondToOffer);
router.put('/:id/counter', protect, counterOffer);

module.exports = router;
