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
  getMyListings,
  checkListingAvailability
} = require('../controllers/listingController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const listingValidation = [
  body('title').trim().notEmpty().withMessage('Listing title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price')
    .custom((value, { req }) => {
      if (req.body.listingType !== 'Rent' && (value === undefined || value === null || isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        throw new Error('Price must be a positive number');
      }
      return true;
    }),
  body('rentalPrice')
    .custom((value, { req }) => {
      if (['Rent', 'Both'].includes(req.body.listingType) && (value === undefined || value === null || isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        throw new Error('Rental price must be a positive number');
      }
      return true;
    }),
  body('rentalPriceUnit')
    .custom((value, { req }) => {
      if (['Rent', 'Both'].includes(req.body.listingType) && (!value || !['hour', 'day', 'week', 'month'].includes(value))) {
        throw new Error('Valid rental price unit is required');
      }
      return true;
    }),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('condition').isIn(['New', 'Like New', 'Good', 'Used']).withMessage('Invalid condition selected'),
];

// Define Listing Routes
router.post('/', protect, upload.array('images', 5), listingValidation, validate, createListing);
router.get('/', getListings);
router.get('/my', protect, getMyListings);
router.post('/:id/check-availability', protect, checkListingAvailability);
router.get('/:id', getListingById);
router.put('/:id', protect, listingValidation, validate, updateListing);
router.delete('/:id', protect, deleteListing);

module.exports = router;
