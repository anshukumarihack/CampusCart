const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  readAllNotifications, 
  readNotification 
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/read-all', protect, readAllNotifications);
router.put('/:id/read', protect, readNotification);

module.exports = router;
