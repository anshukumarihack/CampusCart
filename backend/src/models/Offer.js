const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  message: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Countered', 'Paid', 'Completed'],
    default: 'Pending',
  },
  counterAmount: {
    type: Number,
    default: null,
  },
  counteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  offerType: {
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
  totalAmount: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Offer', OfferSchema);
