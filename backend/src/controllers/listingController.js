const Listing = require('../models/Listing');

// @desc    Create a new product listing
// @route   POST /api/listings
// @access  Private
exports.createListing = async (req, res) => {
  const { 
    title, 
    description, 
    price, 
    category, 
    condition,
    listingType,
    rentalPrice,
    rentalPriceUnit,
    securityDeposit,
    minimumRentalDuration,
    maximumRentalDuration,
    availableFrom,
    availableUntil,
    rentalTerms
  } = req.body;

  if (!title || !description || !category || !condition) {
    return res.status(400).json({ message: 'Title, description, category, and condition are required' });
  }

  try {
    // Gather image urls
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Construct local URL path
        images.push(`/uploads/${file.filename}`);
      });
    }

    const listing = new Listing({
      title,
      description,
      price: price ? parseFloat(price) : undefined,
      category,
      condition,
      images,
      owner: req.user.id,
      status: 'Listed',
      listingType: listingType || 'Sale',
      rentalPrice: rentalPrice ? parseFloat(rentalPrice) : null,
      rentalPriceUnit: rentalPriceUnit || null,
      securityDeposit: securityDeposit ? parseFloat(securityDeposit) : 0,
      minimumRentalDuration: minimumRentalDuration ? parseInt(minimumRentalDuration) : null,
      maximumRentalDuration: maximumRentalDuration ? parseInt(maximumRentalDuration) : null,
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      rentalTerms: rentalTerms || '',
    });

    const savedListing = await listing.save();
    res.status(201).json({ success: true, listing: savedListing });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ message: 'Failed to create listing' });
  }
};

// @desc    Get all listings with search, categories, conditions and price filters
// @route   GET /api/listings
// @access  Public
exports.getListings = async (req, res) => {
  const { search, category, condition, minPrice, maxPrice, status, owner, sortBy, listingType } = req.query;

  // Build filter object
  const query = {};

  // Exclude soft-deleted items by default
  query.status = { $ne: 'Deleted' };

  if (status) {
    query.status = status;
  } else {
    // By default, only show available or active listings
    query.status = { $in: ['Listed', 'Offer Made', 'Accepted', 'Meetup Scheduled'] };
  }

  if (owner) {
    query.owner = owner;
  }

  if (listingType === 'Sale') {
    query.listingType = { $in: ['Sale', 'Both'] };
  } else if (listingType === 'Rent') {
    query.listingType = { $in: ['Rent', 'Both'] };
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (condition) {
    query.condition = condition;
  }

  if (minPrice || maxPrice) {
    if (listingType === 'Rent') {
      query.rentalPrice = {};
      if (minPrice) query.rentalPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.rentalPrice.$lte = parseFloat(maxPrice);
    } else {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
  }

  try {
    // Build sorting options
    let sortOptions = { createdAt: -1 }; // Default: Newest first
    if (sortBy === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sortBy === 'price_desc') {
      sortOptions = { price: -1 };
    }

    const listings = await Listing.find(query)
      .populate('owner', 'name avatar averageRating ratingCount')
      .sort(sortOptions);

    res.status(200).json({ success: true, count: listings.length, listings });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ message: 'Failed to retrieve listings' });
  }
};

// @desc    Get single listing details
// @route   GET /api/listings/:id
// @access  Public
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('owner', 'name email avatar averageRating ratingCount');

    if (!listing || listing.status === 'Deleted') {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.status(200).json({ success: true, listing });
  } catch (error) {
    console.error('Get listing details error:', error);
    res.status(500).json({ message: 'Failed to retrieve listing details' });
  }
};

// @desc    Update listing details
// @route   PUT /api/listings/:id
// @access  Private
exports.updateListing = async (req, res) => {
  const { 
    title, 
    description, 
    price, 
    category, 
    condition, 
    status,
    listingType,
    rentalPrice,
    rentalPriceUnit,
    securityDeposit,
    minimumRentalDuration,
    maximumRentalDuration,
    availableFrom,
    availableUntil,
    rentalTerms
  } = req.body;

  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Enforce listing ownership or admin bypass
    if (listing.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this listing' });
    }

    if (title) listing.title = title;
    if (description) listing.description = description;
    if (price !== undefined) listing.price = price ? parseFloat(price) : undefined;
    if (category) listing.category = category;
    if (condition) listing.condition = condition;
    if (status) listing.status = status;
    if (listingType) listing.listingType = listingType;
    if (rentalPrice !== undefined) listing.rentalPrice = rentalPrice ? parseFloat(rentalPrice) : null;
    if (rentalPriceUnit !== undefined) listing.rentalPriceUnit = rentalPriceUnit || null;
    if (securityDeposit !== undefined) listing.securityDeposit = securityDeposit ? parseFloat(securityDeposit) : 0;
    if (minimumRentalDuration !== undefined) listing.minimumRentalDuration = minimumRentalDuration ? parseInt(minimumRentalDuration) : null;
    if (maximumRentalDuration !== undefined) listing.maximumRentalDuration = maximumRentalDuration ? parseInt(maximumRentalDuration) : null;
    if (availableFrom !== undefined) listing.availableFrom = availableFrom ? new Date(availableFrom) : null;
    if (availableUntil !== undefined) listing.availableUntil = availableUntil ? new Date(availableUntil) : null;
    if (rentalTerms !== undefined) listing.rentalTerms = rentalTerms || '';

    const updatedListing = await listing.save();
    res.status(200).json({ success: true, listing: updatedListing });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ message: 'Failed to update listing' });
  }
};

// @desc    Delete listing (Soft Delete)
// @route   DELETE /api/listings/:id
// @access  Private
exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Enforce listing ownership or admin bypass
    if (listing.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    // Perform Soft Delete
    listing.status = 'Deleted';
    await listing.save();

    res.status(200).json({ success: true, message: 'Listing removed successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ message: 'Failed to delete listing' });
  }
};

// @desc    Get logged in user's listings
// @route   GET /api/listings/my
// @access  Private
exports.getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user.id, status: { $ne: 'Deleted' } })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: listings.length, listings });
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({ message: 'Failed to retrieve your listings' });
  }
};

// @desc    Check rental availability for specified dates
// @route   POST /api/listings/:id/check-availability
// @access  Private
exports.checkListingAvailability = async (req, res) => {
  const { startDate, endDate } = req.body;
  const listingId = req.params.id;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: 'Invalid start or end date format' });
  }

  if (start < new Date().setHours(0, 0, 0, 0)) {
    return res.status(400).json({ message: 'Start date cannot be in the past' });
  }

  if (start >= end) {
    return res.status(400).json({ message: 'Start date must be before end date' });
  }

  try {
    const Transaction = require('../models/Transaction');
    const overlappingTransaction = await Transaction.findOne({
      listing: listingId,
      transactionType: 'Rental',
      rentalStatus: { $nin: ['Cancelled', 'Pending'] },
      rentalStartDate: { $lte: end },
      rentalEndDate: { $gte: start }
    });

    if (overlappingTransaction) {
      return res.status(200).json({
        available: false,
        message: 'The item is already booked for these dates.'
      });
    }

    res.status(200).json({ available: true, message: 'Item is available for these dates.' });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ message: 'Failed to verify availability' });
  }
};

