const express = require('express');
const router = express.Router();

const {
  registerVisitor,
  registerVisitorPublic,
  getAllVisitors,
  getVisitor,
  updateVisitor,
  toggleBlacklist,
  deleteVisitor,
  getVisitorStats
} = require('../controllers/visitorController');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');
const uploadVisitorPhotoCloudinary = require('../middleware/uploadVisitorPhotoCloudinary');

// Public pre-registration (no auth required)
router.post('/register', uploadVisitorPhotoCloudinary.single('photo'), registerVisitorPublic);

// All other visitor routes require authentication
router.use(auth);

// Register a new visitor (accessible by security and admin)
router.post('/', checkRole('admin', 'security'), uploadVisitorPhotoCloudinary.single('photo'), registerVisitor);

// Get all visitors (accessible by security and admin)
router.get('/', getAllVisitors);

// get visitor statistics (admin only)
router.get('/stats', checkRole('admin'), getVisitorStats);

// Get a single visitor by ID (accessible by security and admin)
router.get('/:id', getVisitor);

// Update visitor details (accessible by security and admin)
router.patch('/:id', checkRole('admin', 'security'), uploadVisitorPhotoCloudinary.single('photo'), updateVisitor);

// Toggle blacklist status (admin only)
router.patch('/:id/blacklist', checkRole('admin'), toggleBlacklist);

// Delete a visitor (admin only)
router.delete('/:id', checkRole('admin'), deleteVisitor);

module.exports = router;
