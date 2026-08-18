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

// @desc    Confirm handover of rental item (mutual confirmation)
// @route   PUT /api/transactions/:id/handover
// @access  Private
exports.handoverTransaction = async (req, res) => {
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

    if (isBuyer) {
      transaction.buyerConfirmed = true;
    }
    if (isSeller) {
      transaction.sellerConfirmed = true;
    }

    const io = req.app.get('io');
    const listing = transaction.listing;

    if (transaction.buyerConfirmed && transaction.sellerConfirmed) {
      transaction.rentalStatus = 'Active';
      transaction.handoverDate = new Date();
      // Reset confirmations for return flow usage
      transaction.buyerConfirmed = false;
      transaction.sellerConfirmed = false;

      // Update Listing status
      if (listing) {
        listing.status = 'Completed';
        await listing.save();
      }

      // Create notifications
      const notifyBuyer = new Notification({
        user: transaction.buyer._id,
        type: 'transaction',
        title: 'Rental Active!',
        content: `Handover confirmed! Your rental for "${listing.title}" is now active.`,
        link: `/transactions`,
      });
      await notifyBuyer.save();

      const notifySeller = new Notification({
        user: transaction.seller._id,
        type: 'transaction',
        title: 'Rental Active!',
        content: `Handover confirmed! Rental for "${listing.title}" is now active.`,
        link: `/transactions`,
      });
      await notifySeller.save();

      if (io) {
        io.to(`notify_${transaction.buyer._id}`).emit('notification_received', {
          type: 'transaction',
          title: 'Rental Active!',
          content: `Rental of ${listing.title} is now active.`,
          link: `/transactions`,
        });
        io.to(`notify_${transaction.seller._id}`).emit('notification_received', {
          type: 'transaction',
          title: 'Rental Active!',
          content: `Rental of ${listing.title} is now active.`,
          link: `/transactions`,
        });
      }

      // Embed system message in Chat room log
      const room = await Chat.findOne({ listing: listing._id, buyer: transaction.buyer._id });
      if (room) {
        room.messages.push({
          sender: req.user.id,
          text: `🤝 Handover confirmed! Rental is now Active. Enjoy your item!`,
          timestamp: new Date(),
        });
        room.lastUpdated = new Date();
        await room.save();
        if (io) {
          io.to(room._id.toString()).emit('message_received', {
            roomId: room._id,
            message: room.messages[room.messages.length - 1],
          });
        }
      }
    } else {
      // Notify other user
      const recipientId = isBuyer ? transaction.seller._id : transaction.buyer._id;
      const senderName = req.user.name;

      const notify = new Notification({
        user: recipientId,
        type: 'transaction',
        title: 'Handover Confirmation Requested',
        content: `${senderName} confirmed item handover for "${listing.title}". Please confirm to make the rental active.`,
        link: `/transactions`,
      });
      await notify.save();

      if (io) {
        io.to(`notify_${recipientId}`).emit('notification_received', {
          type: 'transaction',
          title: 'Confirm Handover',
          content: `${senderName} marked item handed over.`,
          link: `/transactions`,
        });
      }
    }

    await transaction.save();
    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Handover transaction error:', error);
    res.status(500).json({ message: 'Failed to confirm handover' });
  }
};

// @desc    Renter schedules rental item return meetup
// @route   PUT /api/transactions/:id/schedule-return
// @access  Private
exports.scheduleReturn = async (req, res) => {
  const { location, time } = req.body;

  if (!location || !time) {
    return res.status(400).json({ message: 'Return location and time are required' });
  }

  try {
    const transaction = await Transaction.findById(req.params.id).populate('listing buyer seller');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify current user is the renter (buyer)
    if (transaction.buyer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the renter can schedule return meetup' });
    }

    transaction.meetupLocation = location;
    transaction.meetupTime = new Date(time);
    transaction.rentalStatus = 'Return Scheduled';

    await transaction.save();

    const io = req.app.get('io');
    const listing = transaction.listing;

    // Create system notification for seller
    const notification = new Notification({
      user: transaction.seller._id,
      type: 'transaction',
      title: 'Return Meetup Scheduled',
      content: `${req.user.name} scheduled a return meetup for "${listing.title}" at ${location}.`,
      link: `/transactions`,
    });
    await notification.save();

    if (io) {
      io.to(`notify_${transaction.seller._id.toString()}`).emit('notification_received', {
        type: 'transaction',
        title: 'Return Meetup Scheduled',
        content: `Return scheduled for ${listing.title} at ${location}`,
        link: `/transactions`,
      });
    }

    // Embed message in Chat room
    const room = await Chat.findOne({ listing: listing._id, buyer: transaction.buyer._id });
    if (room) {
      room.messages.push({
        sender: req.user.id,
        text: `📍 Return Scheduled! Location: ${location}, Time: ${new Date(time).toLocaleString()}`,
        timestamp: new Date(),
      });
      room.lastUpdated = new Date();
      await room.save();
      if (io) {
        io.to(room._id.toString()).emit('message_received', {
          roomId: room._id,
          message: room.messages[room.messages.length - 1],
        });
      }
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Schedule return error:', error);
    res.status(500).json({ message: 'Failed to schedule return meetup' });
  }
};

// @desc    Confirm return of rental item (mutual confirmation)
// @route   PUT /api/transactions/:id/confirm-return
// @access  Private
exports.confirmReturn = async (req, res) => {
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

    if (isBuyer) {
      transaction.buyerConfirmed = true;
    }
    if (isSeller) {
      transaction.sellerConfirmed = true;
    }

    const io = req.app.get('io');
    const listing = transaction.listing;

    if (transaction.buyerConfirmed && transaction.sellerConfirmed) {
      transaction.rentalStatus = 'Returned';
      
      // Auto refund security deposit if no dispute is opened yet
      if (transaction.securityDepositStatus === 'Held') {
        transaction.securityDepositStatus = 'Refunded';
        transaction.rentalStatus = 'Completed';
      }

      transaction.buyerConfirmed = false;
      transaction.sellerConfirmed = false;

      // Update Listing status
      if (listing) {
        listing.status = 'Completed';
        await listing.save();
      }

      // If offer exists, complete it
      if (transaction.offer) {
        const Offer = require('../models/Offer');
        const offer = await Offer.findById(transaction.offer);
        if (offer) {
          offer.status = 'Completed';
          await offer.save();
        }
      }

      // Create notifications
      const notifyBuyer = new Notification({
        user: transaction.buyer._id,
        type: 'transaction',
        title: 'Rental Completed!',
        content: `Rental for "${listing.title}" marked as returned. Security deposit refund triggered!`,
        link: `/transactions`,
      });
      await notifyBuyer.save();

      const notifySeller = new Notification({
        user: transaction.seller._id,
        type: 'transaction',
        title: 'Rental Completed!',
        content: `Rental for "${listing.title}" completed successfully.`,
        link: `/transactions`,
      });
      await notifySeller.save();

      if (io) {
        io.to(`notify_${transaction.buyer._id}`).emit('notification_received', {
          type: 'transaction',
          title: 'Rental Completed!',
          content: `Rental of ${listing.title} completed.`,
          link: `/transactions`,
        });
        io.to(`notify_${transaction.seller._id}`).emit('notification_received', {
          type: 'transaction',
          title: 'Rental Completed!',
          content: `Rental of ${listing.title} completed.`,
          link: `/transactions`,
        });
      }

      // Embed system message in Chat room log
      const room = await Chat.findOne({ listing: listing._id, buyer: transaction.buyer._id });
      if (room) {
        room.messages.push({
          sender: req.user.id,
          text: `↩️ Return confirmed! Item returned to owner. Mock refund processed ($${transaction.securityDeposit.toFixed(2)} refunded). Rental Completed.`,
          timestamp: new Date(),
        });
        room.lastUpdated = new Date();
        await room.save();
        if (io) {
          io.to(room._id.toString()).emit('message_received', {
            roomId: room._id,
            message: room.messages[room.messages.length - 1],
          });
        }
      }
    } else {
      // Notify other user
      const recipientId = isBuyer ? transaction.seller._id : transaction.buyer._id;
      const senderName = req.user.name;

      const notify = new Notification({
        user: recipientId,
        type: 'transaction',
        title: 'Return Confirmation Requested',
        content: `${senderName} confirmed item return for "${listing.title}". Please confirm to finalize.`,
        link: `/transactions`,
      });
      await notify.save();

      if (io) {
        io.to(`notify_${recipientId}`).emit('notification_received', {
          type: 'transaction',
          title: 'Confirm Return',
          content: `${senderName} marked item returned.`,
          link: `/transactions`,
        });
      }
    }

    await transaction.save();
    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Confirm return error:', error);
    res.status(500).json({ message: 'Failed to confirm return' });
  }
};

// @desc    Owner reports damage on returned rental item
// @route   PUT /api/transactions/:id/report-damage
// @access  Private
exports.reportDamage = async (req, res) => {
  const { damageDescription, damageAmount } = req.body;

  if (!damageDescription || damageAmount === undefined || isNaN(parseFloat(damageAmount)) || parseFloat(damageAmount) < 0) {
    return res.status(400).json({ message: 'Valid damage description and amount are required' });
  }

  try {
    const transaction = await Transaction.findById(req.params.id).populate('listing buyer seller');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify current user is the owner (seller)
    if (transaction.seller._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the item owner can report damage' });
    }

    transaction.damageDescription = damageDescription;
    transaction.damageAmount = parseFloat(damageAmount);
    transaction.damageReportedAt = new Date();

    const deposit = transaction.securityDeposit || 0;
    if (parseFloat(damageAmount) >= deposit) {
      transaction.securityDepositStatus = 'Deducted';
    } else {
      transaction.securityDepositStatus = 'Partially Deducted';
    }

    transaction.rentalStatus = 'Completed';
    await transaction.save();

    const io = req.app.get('io');
    const listing = transaction.listing;

    // Notify renter
    const notifyBuyer = new Notification({
      user: transaction.buyer._id,
      type: 'transaction',
      title: 'Damage Reported / Deposit Deducted',
      content: `${req.user.name} reported damage on "${listing.title}". Deduction: $${parseFloat(damageAmount).toFixed(2)}.`,
      link: `/transactions`,
    });
    await notifyBuyer.save();

    if (io) {
      io.to(`notify_${transaction.buyer._id.toString()}`).emit('notification_received', {
        type: 'transaction',
        title: 'Damage Reported',
        content: `Damage reported on ${listing.title}. Deduction: $${parseFloat(damageAmount).toFixed(2)}`,
        link: `/transactions`,
      });
    }

    // Chat Room message
    const room = await Chat.findOne({ listing: listing._id, buyer: transaction.buyer._id });
    if (room) {
      room.messages.push({
        sender: req.user.id,
        text: `⚠️ Damage Reported by Owner! Description: "${damageDescription}", Claimed Amount: $${parseFloat(damageAmount).toFixed(2)}. Security Deposit status: ${transaction.securityDepositStatus}.`,
        timestamp: new Date(),
      });
      room.lastUpdated = new Date();
      await room.save();
      if (io) {
        io.to(room._id.toString()).emit('message_received', {
          roomId: room._id,
          message: room.messages[room.messages.length - 1],
        });
      }
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Report damage error:', error);
    res.status(500).json({ message: 'Failed to record damage report' });
  }
};

// @desc    Admin or Seller overrides to release remaining security deposit
// @route   PUT /api/transactions/:id/refund-deposit
// @access  Private
exports.refundDeposit = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('listing buyer seller');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const isSeller = transaction.seller._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isSeller && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to release deposit refund' });
    }

    transaction.securityDepositStatus = 'Refunded';
    transaction.rentalStatus = 'Completed';
    await transaction.save();

    const io = req.app.get('io');
    const listing = transaction.listing;

    // Notify renter
    const notifyBuyer = new Notification({
      user: transaction.buyer._id,
      type: 'transaction',
      title: 'Security Deposit Refunded',
      content: `Your security deposit of $${transaction.securityDeposit.toFixed(2)} for "${listing.title}" has been released/refunded.`,
      link: `/transactions`,
    });
    await notifyBuyer.save();

    if (io) {
      io.to(`notify_${transaction.buyer._id.toString()}`).emit('notification_received', {
        type: 'transaction',
        title: 'Deposit Refunded',
        content: `Security deposit for ${listing.title} refunded.`,
        link: `/transactions`,
      });
    }

    // Chat Room message
    const room = await Chat.findOne({ listing: listing._id, buyer: transaction.buyer._id });
    if (room) {
      room.messages.push({
        sender: req.user.id,
        text: `💸 Security Deposit Refunded! Amount: $${transaction.securityDeposit.toFixed(2)} has been released back to renter.`,
        timestamp: new Date(),
      });
      room.lastUpdated = new Date();
      await room.save();
      if (io) {
        io.to(room._id.toString()).emit('message_received', {
          roomId: room._id,
          message: room.messages[room.messages.length - 1],
        });
      }
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error('Refund deposit error:', error);
    res.status(500).json({ message: 'Failed to process deposit refund' });
  }
};
