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
  transactionType: {
    type: String,
    enum: ['Sale', 'Rental'],
    default: 'Sale',
  },
  rentalStartDate: {
    type: Date,
    default: null,
  },
  rentalEndDate: {
    type: Date,
    default: null,
  },
  rentalDuration: {
    type: Number,
    default: null,
  },
  rentalAmount: {
    type: Number,
    default: null,
  },
  securityDeposit: {
    type: Number,
    default: null,
  },
  securityDepositStatus: {
    type: String,
    enum: ['Pending', 'Held', 'Refunded', 'Partially Deducted', 'Deducted'],
    default: 'Pending',
  },
  rentalStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Pickup Scheduled', 'Active', 'Return Scheduled', 'Returned', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  damageDescription: {
    type: String,
    default: '',
  },
  damageAmount: {
    type: Number,
    default: 0,
  },
  damageReportedAt: {
    type: Date,
    default: null,
  },
  handoverDate: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
