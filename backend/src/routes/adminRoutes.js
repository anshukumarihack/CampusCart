const express = require('express');
const router = express.Router();
const { 
  getReports, 
  resolveReport, 
  toggleUserBlock, 
  deleteListingOverride,
  getAdminStats,
  getUsersList
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// Define Admin Routes
router.get('/stats', protect, admin, getAdminStats);
router.get('/users', protect, admin, getUsersList);
router.get('/reports', protect, admin, getReports);
router.put('/reports/:id/resolve', protect, admin, resolveReport);
router.put('/users/:id/toggle-block', protect, admin, toggleUserBlock);
router.delete('/listings/:id', protect, admin, deleteListingOverride);

module.exports = router;
