const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const { 
  createListing, 
  getListings, 
  getListingById, 
  updateListing, 
  deleteListing,
  getMyListings
} = require('../controllers/listingController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const listingValidation = [
  body('title').trim().notEmpty().withMessage('Listing title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('condition').isIn(['New', 'Like New', 'Good', 'Used']).withMessage('Invalid condition selected'),
];

// Define Listing Routes
router.post('/', protect, upload.array('images', 5), listingValidation, validate, createListing);
router.get('/', getListings);
router.get('/my', protect, getMyListings);
router.get('/:id', getListingById);
router.put('/:id', protect, listingValidation, validate, updateListing);
router.delete('/:id', protect, deleteListing);

module.exports = router;
