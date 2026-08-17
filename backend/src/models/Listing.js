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
    required: true,
    min: 0,
  },
  category: {
    type: String,
    required: true,
    enum: ['Textbooks', 'Electronics', 'Calculators', 'Furniture', 'Bicycles', 'Clothing', 'Hostel Essentials', 'Other'],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Listing', ListingSchema);
