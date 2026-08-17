const Listing = require('../models/Listing');

// @desc    Create a new product listing
// @route   POST /api/listings
// @access  Private
exports.createListing = async (req, res) => {
  const { title, description, price, category, condition } = req.body;

  if (!title || !description || !price || !category || !condition) {
    return res.status(400).json({ message: 'All listing fields are required' });
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
      price: parseFloat(price),
      category,
      condition,
      images,
      owner: req.user.id,
      status: 'Listed',
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
  const { search, category, condition, minPrice, maxPrice, status, owner, sortBy } = req.query;

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
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
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
  const { title, description, price, category, condition, status } = req.body;

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
    if (price) listing.price = parseFloat(price);
    if (category) listing.category = category;
    if (condition) listing.condition = condition;
    if (status) listing.status = status;

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

