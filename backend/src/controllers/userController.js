const User = require('../models/User');
const Listing = require('../models/Listing');

// @desc    Toggle item in user's wishlist (add/remove)
// @route   POST /api/users/wishlist/:listingId
// @access  Private
exports.toggleWishlist = async (req, res) => {
  const { listingId } = req.params;

  try {
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'Deleted') {
      return res.status(404).json({ message: 'Listing not found or has been removed' });
    }

    const user = await User.findById(req.user.id);
    const wishlistIndex = user.wishlist.indexOf(listingId);

    let isWishlisted = false;
    if (wishlistIndex === -1) {
      user.wishlist.push(listingId);
      isWishlisted = true;
    } else {
      user.wishlist.splice(wishlistIndex, 1);
      isWishlisted = false;
    }

    await user.save();

    res.status(200).json({
      success: true,
      isWishlisted,
      message: isWishlisted ? 'Added to wishlist' : 'Removed from wishlist',
      wishlist: user.wishlist,
    });
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ message: 'Failed to toggle wishlist item' });
  }
};

// @desc    Get user's wishlist items
// @route   GET /api/users/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      match: { status: { $ne: 'Deleted' } }, // Exclude deleted products
      populate: {
        path: 'owner',
        select: 'name avatar averageRating ratingCount',
      },
    });

    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};

// @desc    Get user public profile
// @route   GET /api/users/:id
// @access  Public
exports.getUserPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name avatar averageRating ratingCount college createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get active listings owned by this user
    const listings = await Listing.find({
      owner: user._id,
      status: { $in: ['Listed', 'Offer Made', 'Accepted', 'Meetup Scheduled'] }
    }).sort({ createdAt: -1 });

    // Get reviews received by this user
    const Review = require('../models/Review');
    const reviews = await Review.find({ reviewee: user._id })
      .populate('reviewer', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        averageRating: user.averageRating,
        ratingCount: user.ratingCount,
        college: user.college,
        createdAt: user.createdAt
      },
      listings,
      reviews
    });
  } catch (error) {
    console.error('Get user public profile error:', error);
    res.status(500).json({ message: 'Failed to retrieve user profile details' });
  }
};

