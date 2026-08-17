const Review = require('../models/Review');
const Listing = require('../models/Listing');
const User = require('../models/User');

// @desc    Submit a review and rating for a user after a transaction is completed
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  const { listingId, rating, comment } = req.body;

  if (!listingId || !rating) {
    return res.status(400).json({ message: 'Listing ID and rating score are required' });
  }

  const numericRating = parseInt(rating);
  if (numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5 stars' });
  }

  try {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.status !== 'Completed') {
      return res.status(400).json({ message: 'Reviews can only be submitted after the transaction is completed' });
    }

    // Determine reviewer and reviewee
    // Check if reviewer is buyer or owner
    const isOwner = listing.owner.toString() === req.user.id;
    
    // We need to find the successful offer to identify the buyer
    const Chat = require('../models/Chat');
    const room = await Chat.findOne({ listing: listingId });
    if (!room) {
      return res.status(400).json({ message: 'No chat log found for this transaction' });
    }

    const buyerId = room.buyer.toString();
    const sellerId = listing.owner.toString();

    let revieweeId;
    if (isOwner) {
      // Seller is reviewing buyer
      revieweeId = buyerId;
    } else if (req.user.id === buyerId) {
      // Buyer is reviewing seller
      revieweeId = sellerId;
    } else {
      return res.status(403).json({ message: 'You are not authorized to review this transaction' });
    }

    // Save the review
    const review = new Review({
      listing: listingId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating: numericRating,
      comment: comment || '',
    });

    await review.save();

    // Recalculate reviewee average rating
    const reviews = await Review.find({ reviewee: revieweeId });
    const count = reviews.length;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / count;

    const reviewee = await User.findById(revieweeId);
    reviewee.averageRating = avg;
    reviewee.ratingCount = count;
    await reviewee.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review,
      reviewee: {
        name: reviewee.name,
        averageRating: reviewee.averageRating,
        ratingCount: reviewee.ratingCount,
      }
    });
  } catch (error) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already submitted a review for this transaction' });
    }
    res.status(500).json({ message: 'Failed to submit review' });
  }
};
