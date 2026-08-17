const Report = require('../models/Report');
const Listing = require('../models/Listing');

// @desc    Submit a moderation flag/report for a listing or user
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
  const { reportedUserId, reportedListingId, reason, description } = req.body;

  if (!reason) {
    return res.status(400).json({ message: 'Reason for report is required' });
  }

  try {
    const report = new Report({
      reporter: req.user.id,
      reportedUser: reportedUserId || null,
      reportedListing: reportedListingId || null,
      reason,
      description: description || '',
      status: 'Pending',
    });

    const savedReport = await report.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for reporting. Platform moderators will review this listing shortly.',
      report: savedReport
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ message: 'Failed to submit report. Please try again.' });
  }
};
