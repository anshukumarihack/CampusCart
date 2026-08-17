const express = require('express');
const router = express.Router();
const { getChats, getChatRoom, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getChats);
router.get('/room', protect, getChatRoom);
router.post('/room/:roomId/messages', protect, sendMessage);

module.exports = router;
