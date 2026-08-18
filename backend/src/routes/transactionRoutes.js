const express = require('express');
const router = express.Router();
const { 
  getTransactions, 
  getTransactionById,
  setMeetupDetails, 
  completeTransaction,
  handoverTransaction,
  scheduleReturn,
  confirmReturn,
  reportDamage,
  refundDeposit
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getTransactions);
router.get('/:id', protect, getTransactionById);
router.put('/:id/meetup', protect, setMeetupDetails);
router.put('/:id/complete', protect, completeTransaction);
router.put('/:id/handover', protect, handoverTransaction);
router.put('/:id/schedule-return', protect, scheduleReturn);
router.put('/:id/confirm-return', protect, confirmReturn);
router.put('/:id/report-damage', protect, reportDamage);
router.put('/:id/refund-deposit', protect, refundDeposit);

module.exports = router;
