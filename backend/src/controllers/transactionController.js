const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');

// @desc    Get all transactions involving the logged in user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await Transaction.find({
      $or: [{ buyer: userId }, { seller: userId }]
    })
      .populate('listing', 'title price images status')
      .populate('buyer', 'name email avatar averageRating')
      .populate('seller', 'name email avatar averageRating')
      .populate('offer', 'amount status')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Failed to retrieve transactions' });
  }
};

// @desc    Get single transaction details
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('listing', 'title price images status description category condition owner')
      .populate('buyer', 'name email avatar averageRating ratingCount')
      .populate('seller', 'name email avatar averageRating ratingCount')
      .populate('offer', 'amount status');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (
      transaction.buyer._id.toString() !== req.user.id &&
      transaction.seller._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to view this transaction' });
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ message: 'Failed to retrieve transaction details' });
  }
};

// @desc    Seller sets meetup details (time, location)
// @route   PUT /api/transactions/:id/meetup
// @access  Private
exports.setMeetupDetails = async (req, res) => {
  const { location, time } = req.body;

  if (!location || !time) {
    return res.status(400).json({ message: 'Meetup location and time are required' });
  }

  try {
    const transaction = await Transaction.findById(req.params.id).populate('listing buyer');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify current user is the seller
    if (transaction.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the seller can configure meetup details' });
    }

    transaction.meetupLocation = location;
    transaction.meetupTime = new Date(time);
    transaction.status = 'Meetup Scheduled';
    
    // Also update listing status to 'Meetup Scheduled' if not already
    const listing = await Listing.findById(transaction.listing._id);
    if (listing) {
      listing.status = 'Meetup Scheduled';
      await listing.save();
    }

    await transaction.save();

    // Create system notification for buyer
    const notification = new Notification({
      user: transaction.buyer._id,
      type: 'transaction',
      title: 'Meetup Scheduled',
      content: `${req.user.name} scheduled a meetup for "${listing.title}" at ${location}. Please review.`,
      link: `/transactions`,
    });
    await notification.save();

    // Notify buyer socket
    const io = req.app.get('io');
    io.to(`notify_${transaction.buyer._id.toString()}`).emit('notification_received', {
      type: 'transaction',
      title: 'Meetup Scheduled',
      content: `Meetup scheduled for ${listing.title} at ${location}`,
      link: `/transactions`,
    });

    // Embed system message in Chat room log
    const room = await Chat.findOne({ listing: listing._id, buyer: transaction.buyer._id });
    if (room) {
      room.messages.push({
        sender: req.user.id,
        text: `📍 Meetup Scheduled! Location: ${location}, Time: ${new Date(time).toLocaleString()}`,
        timestamp: new Date(),
      });
      room.lastUpdated = new Date();
      await room.save();
      
      io.to(room._id.toString()).emit('message_received', {
        roomId: room._id,
        message: room.messages[room.messages.length - 1],
      });
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Set meetup details error:', error);
    res.status(500).json({ message: 'Failed to configure meetup details' });
  }
};

// @desc    Confirm and complete transaction (mutual confirmation)
// @route   PUT /api/transactions/:id/complete
// @access  Private
exports.completeTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('listing buyer seller');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const isBuyer = transaction.buyer._id.toString() === req.user.id;
    const isSeller = transaction.seller._id.toString() === req.user.id;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Not authorized to participate in this transaction' });
    }

    // Set confirmation flag
    if (isBuyer) {
      transaction.buyerConfirmed = true;
    }
    if (isSeller) {
      transaction.sellerConfirmed = true;
    }

    // If both confirmed, complete the transaction
    if (transaction.buyerConfirmed && transaction.sellerConfirmed) {
      transaction.status = 'Completed';

      // Update Listing status to 'Completed'
      const listing = await Listing.findById(transaction.listing._id);
      if (listing) {
        listing.status = 'Completed';
        await listing.save();
      }

      // If there is an offer, set status to completed too
      if (transaction.offer) {
        const Offer = require('../models/Offer');
        const offer = await Offer.findById(transaction.offer);
        if (offer) {
          offer.status = 'Completed';
          await offer.save();
        }
      }

      // Notify both parties
      const io = req.app.get('io');
      
      // Notify seller
      const sellerNotification = new Notification({
        user: transaction.seller._id,
        type: 'transaction',
        title: 'Transaction Completed',
        content: `Your transaction for "${listing.title}" is complete. Leave a review for ${transaction.buyer.name}!`,
        link: `/listings/${listing._id}`,
      });
      await sellerNotification.save();
      io.to(`notify_${transaction.seller._id.toString()}`).emit('notification_received', {
        type: 'transaction',
        title: 'Transaction Completed',
        content: `Transaction for ${listing.title} is complete.`,
        link: `/listings/${listing._id}`,
      });

      // Notify buyer
      const buyerNotification = new Notification({
        user: transaction.buyer._id,
        type: 'transaction',
        title: 'Transaction Completed',
        content: `Your transaction for "${listing.title}" is complete. Leave a review for ${transaction.seller.name}!`,
        link: `/listings/${listing._id}`,
      });
      await buyerNotification.save();
      io.to(`notify_${transaction.buyer._id.toString()}`).emit('notification_received', {
        type: 'transaction',
        title: 'Transaction Completed',
        content: `Transaction for ${listing.title} is complete.`,
        link: `/listings/${listing._id}`,
      });

      // Embed system message in Chat room log
      const room = await Chat.findOne({ listing: listing._id, buyer: transaction.buyer._id });
      if (room) {
        room.messages.push({
          sender: req.user.id,
          text: `✅ Transaction completed successfully! Both buyer and seller confirmed meetup completion.`,
          timestamp: new Date(),
        });
        room.lastUpdated = new Date();
        await room.save();
        
        io.to(room._id.toString()).emit('message_received', {
          roomId: room._id,
          message: room.messages[room.messages.length - 1],
        });
      }
    } else {
      // One party confirmed, notify the other
      const recipientId = isBuyer ? transaction.seller._id : transaction.buyer._id;
      const senderName = req.user.name;
      const listing = transaction.listing;

      const notification = new Notification({
        user: recipientId,
        type: 'transaction',
        title: 'Completion Confirmation Requested',
        content: `${senderName} has marked the transaction for "${listing.title}" as completed. Please confirm to finalize.`,
        link: `/transactions`,
      });
      await notification.save();

      const io = req.app.get('io');
      io.to(`notify_${recipientId.toString()}`).emit('notification_received', {
        type: 'transaction',
        title: 'Confirm Completion',
        content: `${senderName} marked transaction complete.`,
        link: `/transactions`,
      });
    }

    await transaction.save();
    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Complete transaction error:', error);
    res.status(500).json({ message: 'Failed to complete transaction' });
  }
};
