const express = require('express');
const router = express.Router();

const {
  checkIn,
  checkOut,
  getAllCheckLogs,
  getCheckLog,
  getCurrentVisitors,
  getCheckLogStats,
  getVisitorHistory
} = require('../controllers/checkLogController');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// All routes require authentication
router.use(auth);

// Check-in visitor (security)
router.post('/checkin', checkRole('admin', 'security'), checkIn);

// Check-out visitor (security)
router.patch('/checkout/:id', checkRole('admin', 'security'), checkOut);

// Get all check logs
router.get('/', getAllCheckLogs);

// Get currently checked-in visitors
router.get('/current', getCurrentVisitors);

// Get check log stats
router.get('/stats', getCheckLogStats);

// Get visitor history
router.get('/visitor/:visitorId', getVisitorHistory);

// Get single check log
router.get('/:id', getCheckLog);

module.exports = router;
