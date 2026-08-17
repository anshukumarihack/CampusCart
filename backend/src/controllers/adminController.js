const Report = require('../models/Report');
const User = require('../models/User');
const Listing = require('../models/Listing');

// @desc    Get all flagged reports in the platform
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email isBlocked')
      .populate('reportedListing', 'title price status images')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Failed to retrieve moderation reports' });
  }
};

// @desc    Mark a report as Resolved
// @route   PUT /api/admin/reports/:id/resolve
// @access  Private/Admin
exports.resolveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = 'Resolved';
    await report.save();

    res.status(200).json({ success: true, message: 'Report marked as resolved', report });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ message: 'Failed to resolve report' });
  }
};

// @desc    Toggle block/unblock status for a student account
// @route   PUT /api/admin/users/:id/toggle-block
// @access  Private/Admin
exports.toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Administrators cannot be blocked' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isBlocked ? 'Student account suspended' : 'Student account unsuspended',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked,
      }
    });
  } catch (error) {
    console.error('Toggle block error:', error);
    res.status(500).json({ message: 'Failed to toggle account block status' });
  }
};

// @desc    Admin override to remove listing (Soft Delete)
// @route   DELETE /api/admin/listings/:id
// @access  Private/Admin
exports.deleteListingOverride = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.status = 'Deleted';
    await listing.save();

    res.status(200).json({ success: true, message: 'Listing removed by administrator overrides' });
  } catch (error) {
    console.error('Delete override error:', error);
    res.status(500).json({ message: 'Failed to remove listing' });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'student' });
    const totalListings = await Listing.countDocuments({ status: { $ne: 'Deleted' } });
    const activeListings = await Listing.countDocuments({ status: { $in: ['Listed', 'Offer Made', 'Accepted', 'Meetup Scheduled'] } });
    const completedTransactions = await Listing.countDocuments({ status: 'Completed' });
    const pendingReports = await Report.countDocuments({ status: 'Pending' });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalListings,
        activeListings,
        completedTransactions,
        pendingReports,
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Failed to retrieve administrative statistics' });
  }
};

// @desc    Get all students
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsersList = async (req, res) => {
  const { search } = req.query;
  const query = { role: 'student' };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const users = await User.find(query)
      .select('name email avatar averageRating ratingCount isBlocked createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Get admin users list error:', error);
    res.status(500).json({ message: 'Failed to retrieve student accounts list' });
  }
};

