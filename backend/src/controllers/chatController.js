const Chat = require('../models/Chat');
const Listing = require('../models/Listing');

// @desc    Get all chat rooms involving the current user
// @route   GET /api/chats
// @access  Private
exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find chats where user is either the buyer or the seller
    const chats = await Chat.find({
      $or: [{ buyer: userId }, { seller: userId }]
    })
      .populate('listing', 'title price images status')
      .populate('buyer', 'name avatar averageRating')
      .populate('seller', 'name avatar averageRating')
      .populate('messages.offerAttached')
      .sort({ lastUpdated: -1 });

    res.status(200).json({ success: true, count: chats.length, chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// @desc    Get or create a chat room for a listing, buyer, and seller
// @route   GET /api/chats/room
// @access  Private
exports.getChatRoom = async (req, res) => {
  const { listingId, buyerId, sellerId } = req.query;

  if (!listingId || !buyerId || !sellerId) {
    return res.status(400).json({ message: 'Listing, buyer, and seller IDs are required' });
  }

  try {
    // 1. Verify listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // 2. Find existing room
    let room = await Chat.findOne({
      listing: listingId,
      buyer: buyerId
    })
      .populate('listing', 'title price images status owner')
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('messages.offerAttached');

    // 3. Create room if it doesn't exist
    if (!room) {
      room = new Chat({
        listing: listingId,
        buyer: buyerId,
        seller: sellerId,
        messages: [],
      });
      await room.save();
      
      // Populate the newly created room
      room = await Chat.findById(room._id)
        .populate('listing', 'title price images status owner')
        .populate('buyer', 'name avatar email')
        .populate('seller', 'name avatar email')
        .populate('messages.offerAttached');
    }

    res.status(200).json({ success: true, room });
  } catch (error) {
    console.error('Get chat room error:', error);
    res.status(500).json({ message: 'Failed to retrieve or create chat room' });
  }
};

// @desc    Send message (HTTP fallback / persistence check)
// @route   POST /api/chats/room/:roomId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  const { text, offerId } = req.body;
  const { roomId } = req.params;

  if (!text && !offerId) {
    return res.status(400).json({ message: 'Message text or offer attachment is required' });
  }

  try {
    const room = await Chat.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Enforce participant authorization
    if (
      room.buyer.toString() !== req.user.id &&
      room.seller.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to send messages in this room' });
    }

    const newMessage = {
      sender: req.user.id,
      text: text || 'Sent an offer attachment.',
      offerAttached: offerId || null,
      timestamp: new Date()
    };

    room.messages.push(newMessage);
    room.lastUpdated = new Date();
    await room.save();

    // Trigger Socket.IO real-time notification
    const io = req.app.get('io');
    const recipientId = room.buyer.toString() === req.user.id ? room.seller.toString() : room.buyer.toString();
    
    // Emit message to the room
    io.to(roomId).emit('message_received', {
      roomId,
      message: room.messages[room.messages.length - 1]
    });

    // Push new message notification to individual user socket
    io.to(`notify_${recipientId}`).emit('notification_received', {
      type: 'message',
      title: `New message from ${req.user.name}`,
      content: text ? (text.length > 50 ? `${text.slice(0, 50)}...` : text) : 'Sent an offer attachment.',
      link: `/chat?listingId=${room.listing}&buyerId=${room.buyer}`,
    });

    res.status(200).json({ success: true, message: room.messages[room.messages.length - 1] });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};
