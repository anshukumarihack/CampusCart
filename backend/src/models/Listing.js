const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: function() { return this.listingType !== 'Rent'; },
    min: 0,
  },
  category: {
    type: String,
    required: true,
    enum: ['Stationery', 'Electronics', 'Calculators', 'Furniture', 'Vehicles', 'Clothing', 'Hostel Essentials', 'Other'],
  },
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Good', 'Used'],
  },
  images: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['Listed', 'Offer Made', 'Accepted', 'Meetup Scheduled', 'Completed', 'Deleted'],
    default: 'Listed',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  listingType: {
    type: String,
    enum: ['Sale', 'Rent', 'Both'],
    default: 'Sale',
  },
  rentalPrice: {
    type: Number,
    default: null,
  },
  rentalPriceUnit: {
    type: String,
    enum: ['hour', 'day', 'week', 'month'],
    default: null,
  },
  securityDeposit: {
    type: Number,
    default: 0,
  },
  minimumRentalDuration: {
    type: Number,
    default: null,
  },
  maximumRentalDuration: {
    type: Number,
    default: null,
  },
  availableFrom: {
    type: Date,
    default: null,
  },
  availableUntil: {
    type: Date,
    default: null,
  },
  isAvailableForRent: {
    type: Boolean,
    default: true,
  },
  isAvailableForSale: {
    type: Boolean,
    default: true,
  },
  rentalTerms: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Listing', ListingSchema);
