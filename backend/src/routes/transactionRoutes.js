const express = require('express');
const router = express.Router();
const { 
  getTransactions, 
  getTransactionById,
  setMeetupDetails, 
  completeTransaction 
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getTransactions);
router.get('/:id', protect, getTransactionById);
router.put('/:id/meetup', protect, setMeetupDetails);
router.put('/:id/complete', protect, completeTransaction);

module.exports = router;
