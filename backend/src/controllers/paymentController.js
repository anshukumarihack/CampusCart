const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const Offer = require('../models/Offer');
const Listing = require('../models/Listing');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');

// Helper function to update state when payment is successful
const processSuccessfulPayment = async (offerId, listingId, io) => {
  const offer = await Offer.findById(offerId).populate('buyer seller');
  const listing = await Listing.findById(listingId);

  if (!offer || !listing) return;

  // Transition statuses
  offer.status = 'Paid';
  await offer.save();

  listing.status = 'Meetup Scheduled';
  await listing.save();

  // Create or update Transaction document
  let transaction = await Transaction.findOne({ listing: listingId, buyer: offer.buyer._id });
  if (!transaction) {
    transaction = new Transaction({
      listing: listingId,
      buyer: offer.buyer._id,
      seller: offer.seller._id,
      offer: offerId,
      status: 'Meetup Scheduled',
    });
  } else {
    transaction.status = 'Meetup Scheduled';
    transaction.offer = offerId;
  }
  await transaction.save();

  // Create notifications
  const notifyBuyer = new Notification({
    user: offer.buyer._id,
    type: 'transaction',
    title: 'Payment Successful!',
    content: `Your payment for "${listing.title}" is verified. Coordinate with ${offer.seller.name} in chat to schedule meetup.`,
    link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer._id}`,
  });
  await notifyBuyer.save();

  const notifySeller = new Notification({
    user: offer.seller._id,
    type: 'transaction',
    title: 'Item Paid Online!',
    content: `Buyer has paid for "${listing.title}". Coordinate meetup with buyer in chat.`,
    link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer._id}`,
  });
  await notifySeller.save();

  // Embed system message in Chat room log
  const room = await Chat.findOne({ listing: listingId, buyer: offer.buyer._id });
  if (room) {
    room.messages.push({
      sender: offer.seller._id, // seller or system sender ID
      text: '💳 Payment verified successfully! Transaction status updated to: Paid. Please schedule a safe meetup location on campus.',
      timestamp: new Date(),
    });
    room.lastUpdated = new Date();
    await room.save();

    if (io) {
      // Broadcast new message bubble
      io.to(room._id.toString()).emit('message_received', {
        roomId: room._id,
        message: room.messages[room.messages.length - 1],
      });
      // Broadcast offer status change
      io.to(room._id.toString()).emit('offer_changed', { offerId });
    }
  }

  // Push notifications directly to active Sockets
  if (io) {
    io.to(`notify_${offer.buyer._id}`).emit('notification_received', {
      type: 'transaction',
      title: 'Payment Successful!',
      content: `Payment for ${listing.title} confirmed.`,
      link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer._id}`,
    });
    io.to(`notify_${offer.seller._id}`).emit('notification_received', {
      type: 'transaction',
      title: 'Payment Confirmed',
      content: `Item ${listing.title} paid by buyer.`,
      link: `/chat?listingId=${listing._id}&buyerId=${offer.buyer._id}`,
    });
  }
};

// @desc    Create a Stripe checkout session for an accepted offer
// @route   POST /api/payments/checkout-session/:offerId
// @access  Private
exports.createCheckoutSession = async (req, res) => {
  const { offerId } = req.params;

  try {
    const offer = await Offer.findById(offerId).populate('listing buyer seller');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    if (offer.buyer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to make payment on this offer' });
    }

    if (offer.status !== 'Accepted') {
      return res.status(400).json({ message: 'This offer has not been accepted by the seller' });
    }

    const listing = offer.listing;

    // Check if Stripe configuration is missing to activate Dev Mock checkout
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isMock = !stripeKey || stripeKey.includes('your_secret_key') || stripeKey === 'sk_test_dummy';

    if (isMock) {
      console.log(`[MOCK PAYMENT ENGINE] Creating mock redirect for Offer: ${offerId}`);
      // Point directly to mock redirect success endpoint
      const mockCheckoutUrl = `http://127.0.0.1:5050/api/payments/mock-success?offerId=${offerId}&listingId=${listing._id}&buyerId=${offer.buyer._id}`;
      
      return res.status(200).json({
        success: true,
        mode: 'mock',
        checkoutUrl: mockCheckoutUrl,
      });
    }

    // Process real Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: listing.title,
              description: `CampusCart item transaction - sold by ${offer.seller.name}`,
            },
            unit_amount: Math.round(offer.amount * 100), // convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://127.0.0.1:5173/chat?listingId=${listing._id}&buyerId=${offer.buyer._id}&payment_status=success`,
      cancel_url: `http://127.0.0.1:5173/chat?listingId=${listing._id}&buyerId=${offer.buyer._id}&payment_status=cancel`,
      metadata: {
        offerId: offer._id.toString(),
        listingId: listing._id.toString(),
        buyerId: offer.buyer._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      mode: 'stripe',
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('Payment checkout session error:', error);
    res.status(500).json({ message: 'Failed to initialize payment checkout session' });
  }
};

// @desc    Developer mock payment callback (simulates webhooks in dev mode)
// @route   GET /api/payments/mock-success
// @access  Public
exports.handleMockSuccess = async (req, res) => {
  const { offerId, listingId, buyerId } = req.query;
  const io = req.app.get('io');

  try {
    await processSuccessfulPayment(offerId, listingId, io);
    res.redirect(`http://127.0.0.1:5173/chat?listingId=${listingId}&buyerId=${buyerId}&payment_status=success`);
  } catch (error) {
    console.error('Mock payment handler error:', error);
    res.status(500).send('Simulated checkout database update failed.');
  }
};

// @desc    Stripe Webhook event parser
// @route   POST /api/payments/webhook
// @access  Public (Webhook verification via signature validation)
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Must be the raw request buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Signature Verification Failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful card payment session
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { offerId, listingId } = session.metadata;
    const io = req.app.get('io');

    try {
      await processSuccessfulPayment(offerId, listingId, io);
      console.log(`[STRIPE PAYMENT] Payment completed successfully. Offer: ${offerId}, Listing: ${listingId}`);
    } catch (error) {
      console.error('Database write error upon payment callback:', error);
      return res.status(500).send('Payment success state update failed');
    }
  }

  res.status(200).json({ received: true });
};
