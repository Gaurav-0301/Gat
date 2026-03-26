const express = require('express');
const router = express.Router();

const {
  issuePass,
  getAllPasses,
  getPass,
  verifyPass,
  revokePass,
  updateExpiredPasses,
  getPassStats,
  getMyActivePass
} = require('../controllers/passController');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Public route: Verify pass by number/appointmentId (for check-in without role restriction)
router.get('/verify/:passNumber', verifyPass);
router.post('/verify', verifyPass);

// All remaining routes require authentication
router.use(auth);

// Issue pass (admin or security)
router.post('/', checkRole('admin', 'security'), issuePass);

// Get all passes
router.get('/', getAllPasses);

// Get pass stats
router.get('/stats', getPassStats);

// Get my active pass (visitor)
router.get('/my/active', getMyActivePass);
// Alias for client requirement: GET /api/passes/my
router.get('/my', getMyActivePass);

// Update expired passes (admin or security)
router.patch('/update-expired', checkRole('admin', 'security'), updateExpiredPasses);

// Get single pass by ID
router.get('/:id', getPass);

// Revoke pass (✅ admin only)
router.patch('/:id/revoke', checkRole('admin'), revokePass);

module.exports = router;
