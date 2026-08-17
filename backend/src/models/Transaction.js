const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    default: null,
  },
  status: {
    type: String,
    enum: ['Listed', 'Interested', 'Offer Made', 'Accepted', 'Meetup Scheduled', 'Completed'],
    default: 'Interested',
  },
  meetupLocation: {
    type: String,
    default: '',
  },
  meetupTime: {
    type: Date,
    default: null,
  },
  buyerConfirmed: {
    type: Boolean,
    default: false,
  },
  sellerConfirmed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
