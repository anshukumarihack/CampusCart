const express = require('express');
const router = express.Router();
const { toggleWishlist, getWishlist, getUserPublicProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/wishlist/:listingId', protect, toggleWishlist);
router.get('/wishlist', protect, getWishlist);
router.get('/:id', protect, getUserPublicProfile);

module.exports = router;
