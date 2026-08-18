const Offer = require('../models/Offer');
const Listing = require('../models/Listing');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');

// @desc    Make an offer on a product listing
// @route   POST /api/offers
// @access  Private
exports.createOffer = async (req, res) => {
  const { 
    listingId, 
    amount, 
    message,
    offerType,
    rentalStartDate,
    rentalEndDate,
    rentalDuration,
    rentalAmount,
    securityDeposit,
    totalAmount
  } = req.body;

  if (!listingId || !amount) {
    return res.status(400).json({ message: 'Listing ID and offer amount are required' });
  }

  try {
    const listing = await Listing.findById(listingId);
    
    if (!listing || listing.status === 'Deleted') {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.owner.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot make an offer on your own listing' });
    }

    if (offerType === 'Rental') {
      if (!rentalStartDate || !rentalEndDate || !rentalDuration || !rentalAmount) {
        return res.status(400).json({ message: 'All rental offer details are required' });
      }

      const start = new Date(rentalStartDate);
      const end = new Date(rentalEndDate);

      if (start < new Date().setHours(0, 0, 0, 0)) {
        return res.status(400).json({ message: 'Rental start date cannot be in the past' });
      }
      if (start >= end) {
        return res.status(400).json({ message: 'Rental start date must be before end date' });
      }

      if (listing.minimumRentalDuration && rentalDuration < listing.minimumRentalDuration) {
        return res.status(400).json({ message: `Minimum rental duration is ${listing.minimumRentalDuration} days` });
      }
      if (listing.maximumRentalDuration && rentalDuration > listing.maximumRentalDuration) {
        return res.status(400).json({ message: `Maximum rental duration is ${listing.maximumRentalDuration} days` });
      }

      // Check overlapping bookings
      const overlappingTransaction = await Transaction.findOne({
        listing: listingId,
        transactionType: 'Rental',
        rentalStatus: { $nin: ['Cancelled', 'Pending'] },
        rentalStartDate: { $lte: end },
        rentalEndDate: { $gte: start }
      });

      if (overlappingTransaction) {
        return res.status(400).json({ message: 'The item is already booked for these dates.' });
      }
    }

    // Create the Offer document
    const offer = new Offer({
      listing: listingId,
      buyer: req.user.id,
      seller: listing.owner,
      amount: parseFloat(amount),
      message: message || '',
      status: 'Pending',
      offerType: offerType || 'Sale',
      rentalStartDate: rentalStartDate ? new Date(rentalStartDate) : null,
      rentalEndDate: rentalEndDate ? new Date(rentalEndDate) : null,
      rentalDuration: rentalDuration ? parseInt(rentalDuration) : null,
      rentalAmount: rentalAmount ? parseFloat(rentalAmount) : null,
      securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
    });

    const savedOffer = await offer.save();

    // Transition listing state to 'Offer Made' if it was 'Listed'
    if (listing.status === 'Listed') {
      listing.status = 'Offer Made';
      await listing.save();
    }

    // Create or update Transaction document with status 'Offer Made'
    let transaction = await Transaction.findOne({ listing: listingId, buyer: req.user.id });
    if (!transaction) {
      transaction = new Transaction({
        listing: listingId,
        buyer: req.user.id,
        seller: listing.owner,
        offer: savedOffer._id,
        status: 'Offer Made',
        transactionType: offerType || 'Sale',
        rentalStatus: offerType === 'Rental' ? 'Pending' : undefined,
      });
    } else {
      transaction.status = 'Offer Made';
      transaction.offer = savedOffer._id;
      transaction.transactionType = offerType || 'Sale';
      if (offerType === 'Rental') {
        transaction.rentalStatus = 'Pending';
      }
    }
    await transaction.save();

    // Create or find a Chat Room between buyer and seller for this listing
    let room = await Chat.findOne({
      listing: listingId,
      buyer: req.user.id
    });

    if (!room) {
      room = new Chat({
        listing: listingId,
        buyer: req.user.id,
        seller: listing.owner,
        messages: [],
      });
    }

    // Embed offer inside the chat conversation as a system message
    const offerMessage = {
      sender: req.user.id,
      text: message 
        ? `Proposed an offer of $${parseFloat(amount).toFixed(2)}: "${message}"` 
        : `Proposed an offer of $${parseFloat(amount).toFixed(2)}`,
      offerAttached: savedOffer._id,
      timestamp: new Date()
    };

    room.messages.push(offerMessage);
    room.lastUpdated = new Date();
    await room.save();

    // Create system notification for seller
    const notification = new Notification({
      user: listing.owner,
      type: 'offer',
      title: 'New Offer Received',
      content: `${req.user.name} made an offer of $${parseFloat(amount).toFixed(2)} on "${listing.title}"`,
      link: `/chat?listingId=${listingId}&buyerId=${req.user.id}`,
    });
    await notification.save();

    // Emit live Socket events
    const io = req.app.get('io');
    
    // Broadcast message to the chat room
    io.to(room._id.toString()).emit('message_received', {
      roomId: room._id,
      message: room.messages[room.messages.length - 1],
    });

    // Notify seller socket
    io.to(`notify_${listing.owner.toString()}`).emit('notification_received', {
      type: 'offer',
      title: 'New Offer Made',
      content: `${req.user.name} offered $${parseFloat(amount).toFixed(2)} for ${listing.title}`,
      link: `/chat?listingId=${listingId}&buyerId=${req.user.id}`,
    });

    res.status(201).json({ success: true, offer: savedOffer });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ message: 'Failed to submit negotiation offer' });
  }
};

// @desc    Accept, Reject, or Counter-Offer response
// @route   POST /api/offers/:id/respond
// @access  Private
exports.respondToOffer = async (req, res) => {
  const { status, counterAmount } = req.body;
  const offerId = req.params.id;

  if (!status || !['Accepted', 'Rejected', 'Countered'].includes(status)) {
    return res.status(400).json({ message: 'Valid response status is required' });
  }

  try {
    const offer = await Offer.findById(offerId).populate('listing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const isSeller = offer.seller.toString() === req.user.id;
    const isBuyer = offer.buyer.toString() === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Not authorized to respond to this offer' });
    }

    offer.status = status;

    const listing = await Listing.findById(offer.listing._id);
    const room = await Chat.findOne({ listing: offer.listing._id, buyer: offer.buyer });

    const io = req.app.get('io');

    if (status === 'Accepted') {
      if (offer.offerType === 'Rental') {
        const start = offer.rentalStartDate;
        const end = offer.rentalEndDate;
        const overlappingTransaction = await Transaction.findOne({
          listing: listing._id,
          transactionType: 'Rental',
          rentalStatus: { $nin: ['Cancelled', 'Pending'] },
          rentalStartDate: { $lte: end },
          rentalEndDate: { $gte: start }
        });
        if (overlappingTransaction) {
          return res.status(400).json({ message: 'The item is already booked for these dates.' });
        }
      }

      offer.status = 'Accepted';
      listing.status = 'Accepted';
      await listing.save();

      // Create/update Transaction to 'Accepted'
      let transaction = await Transaction.findOne({ listing: listing._id, buyer: offer.buyer });
      if (!transaction) {
        transaction = new Transaction({
          listing: listing._id,
          buyer: offer.buyer,
          seller: offer.seller,
          offer: offer._id,
          status: 'Accepted',
          transactionType: offer.offerType || 'Sale',
        });
      } else {
        transaction.status = 'Accepted';
        transaction.offer = offer._id;
        transaction.transactionType = offer.offerType || 'Sale';
      }

      if (offer.offerType === 'Rental') {
        transaction.rentalStartDate = offer.rentalStartDate;
        transaction.rentalEndDate = offer.rentalEndDate;
        transaction.rentalDuration = offer.rentalDuration;
        transaction.rentalAmount = offer.amount;
        transaction.securityDeposit = offer.securityDeposit;
        transaction.securityDepositStatus = 'Pending';
        transaction.rentalStatus = 'Pending';
      }

      await transaction.save();

      // System notification for buyer
      const notification = new Notification({
        user: offer.buyer,
        type: 'transaction',
        title: offer.offerType === 'Rental' ? 'Rental Request Accepted!' : 'Offer Accepted!',
        content: offer.offerType === 'Rental'
          ? `Your rental request of $${offer.amount.toFixed(2)} on "${listing.title}" was accepted! You can now proceed to pay online.`
          : `Your offer of $${offer.amount.toFixed(2)} on "${listing.title}" was accepted! You can now proceed to pay online.`,
        link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
      });
      await notification.save();

      if (room) {
        room.messages.push({
          sender: req.user.id,
          text: offer.offerType === 'Rental'
            ? `🎉 Rental request ACCEPTED for $${offer.amount.toFixed(2)} (${offer.rentalDuration} days)! Renter can now proceed with payment.`
            : `🎉 Offer ACCEPTED for $${offer.amount.toFixed(2)}! Buyer can now proceed with online checkouts.`,
          timestamp: new Date(),
        });
        room.lastUpdated = new Date();
        await room.save();
        
        io.to(room._id.toString()).emit('message_received', {
          roomId: room._id,
          message: room.messages[room.messages.length - 1],
        });
      }

      io.to(`notify_${offer.buyer.toString()}`).emit('notification_received', {
        type: 'transaction',
        title: 'Offer Accepted!',
        content: `Offer of $${offer.amount.toFixed(2)} for ${listing.title} was accepted.`,
        link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
      });
    }

    if (status === 'Rejected') {
      offer.status = 'Rejected';
      listing.status = 'Listed';
      await listing.save();

      const notification = new Notification({
        user: offer.buyer,
        type: 'offer',
        title: 'Offer Declined',
        content: `Your offer of $${offer.amount.toFixed(2)} on "${listing.title}" was declined by the seller.`,
        link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
      });
      await notification.save();

      if (room) {
        room.messages.push({
          sender: req.user.id,
          text: `❌ Offer declined by seller.`,
          timestamp: new Date(),
        });
        room.lastUpdated = new Date();
        await room.save();
        
        io.to(room._id.toString()).emit('message_received', {
          roomId: room._id,
          message: room.messages[room.messages.length - 1],
        });
      }

      io.to(`notify_${offer.buyer.toString()}`).emit('notification_received', {
        type: 'offer',
        title: 'Offer Declined',
        content: `Offer for ${listing.title} was declined.`,
        link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
      });
    }

    if (status === 'Countered') {
      if (!counterAmount || parseFloat(counterAmount) < 0) {
        return res.status(400).json({ message: 'Counter-offer amount is required' });
      }

      offer.status = 'Countered';
      offer.counterAmount = parseFloat(counterAmount);
      offer.counteredBy = req.user.id;

      // Update Transaction status to 'Offer Made' or keep 'Offer Made'
      let transaction = await Transaction.findOne({ listing: listing._id, buyer: offer.buyer });
      if (transaction) {
        transaction.status = 'Offer Made';
        await transaction.save();
      }

      const recipientId = isSeller ? offer.buyer : offer.seller;

      const notification = new Notification({
        user: recipientId,
        type: 'offer',
        title: 'Counter-Offer Proposed',
        content: `${req.user.name} proposed a counter-offer of $${parseFloat(counterAmount).toFixed(2)} on "${listing.title}"`,
        link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
      });
      await notification.save();

      if (room) {
        room.messages.push({
          sender: req.user.id,
          text: `⚖️ Propose counter-offer at: $${parseFloat(counterAmount).toFixed(2)}`,
          timestamp: new Date(),
        });
        room.lastUpdated = new Date();
        await room.save();

        io.to(room._id.toString()).emit('message_received', {
          roomId: room._id,
          message: room.messages[room.messages.length - 1],
        });
      }

      io.to(`notify_${recipientId.toString()}`).emit('notification_received', {
        type: 'offer',
        title: 'Counter-Offer Proposed',
        content: `Proposed counter of $${parseFloat(counterAmount).toFixed(2)} for ${listing.title}`,
        link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
      });
    }

    await offer.save();
    io.to(room?._id.toString()).emit('offer_changed', { offerId });

    res.status(200).json({ success: true, offer });
  } catch (error) {
    console.error('Respond to offer error:', error);
    res.status(500).json({ message: 'Failed to process offer response' });
  }
};

// @desc    Get offers received (seller view)
// @route   GET /api/offers/received
// @access  Private
exports.getOffersReceived = async (req, res) => {
  try {
    const offers = await Offer.find({ seller: req.user.id })
      .populate('listing', 'title price images status')
      .populate('buyer', 'name email avatar averageRating ratingCount')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: offers.length, offers });
  } catch (error) {
    console.error('Get offers received error:', error);
    res.status(500).json({ message: 'Failed to retrieve received offers' });
  }
};

// @desc    Get offers sent (buyer view)
// @route   GET /api/offers/sent
// @access  Private
exports.getOffersSent = async (req, res) => {
  try {
    const offers = await Offer.find({ buyer: req.user.id })
      .populate('listing', 'title price images status')
      .populate('seller', 'name email avatar averageRating ratingCount')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: offers.length, offers });
  } catch (error) {
    console.error('Get offers sent error:', error);
    res.status(500).json({ message: 'Failed to retrieve sent offers' });
  }
};

// @desc    Counter an offer with a new price
// @route   PUT /api/offers/:id/counter
// @access  Private
exports.counterOffer = async (req, res) => {
  const { counterAmount } = req.body;
  const offerId = req.params.id;

  if (!counterAmount || parseFloat(counterAmount) < 0) {
    return res.status(400).json({ message: 'Valid counter-offer amount is required' });
  }

  try {
    const offer = await Offer.findById(offerId).populate('listing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const isSeller = offer.seller.toString() === req.user.id;
    const isBuyer = offer.buyer.toString() === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Not authorized to respond to this offer' });
    }

    offer.status = 'Countered';
    offer.counterAmount = parseFloat(counterAmount);
    offer.counteredBy = req.user.id;

    await offer.save();

    const listing = offer.listing;
    const room = await Chat.findOne({ listing: listing._id, buyer: offer.buyer });

    // Update Transaction status to 'Offer Made'
    let transaction = await Transaction.findOne({ listing: listing._id, buyer: offer.buyer });
    if (transaction) {
      transaction.status = 'Offer Made';
      await transaction.save();
    }

    const io = req.app.get('io');
    const recipientId = isSeller ? offer.buyer : offer.seller;

    const notification = new Notification({
      user: recipientId,
      type: 'offer',
      title: 'Counter-Offer Proposed',
      content: `${req.user.name} proposed a counter-offer of $${parseFloat(counterAmount).toFixed(2)} on "${listing.title}"`,
      link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
    });
    await notification.save();

    if (room) {
      room.messages.push({
        sender: req.user.id,
        text: `⚖️ Proposed counter-offer at: $${parseFloat(counterAmount).toFixed(2)}`,
        timestamp: new Date(),
      });
      room.lastUpdated = new Date();
      await room.save();

      io.to(room._id.toString()).emit('message_received', {
        roomId: room._id,
        message: room.messages[room.messages.length - 1],
      });
    }

    io.to(`notify_${recipientId.toString()}`).emit('notification_received', {
      type: 'offer',
      title: 'Counter-Offer Proposed',
      content: `Proposed counter of $${parseFloat(counterAmount).toFixed(2)} for ${listing.title}`,
      link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer}`,
    });

    io.to(room?._id.toString()).emit('offer_changed', { offerId });

    res.status(200).json({ success: true, offer });
  } catch (error) {
    console.error('Counter offer error:', error);
    res.status(500).json({ message: 'Failed to submit counter-offer' });
  }
};
