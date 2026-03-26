const express = require('express');
const router = express.Router();

// Import everything once at the top
const {
  createAppointment,
  createAppointmentPublic,
  getAllAppointments,
  getAppointmentsByVisitor,
  getMyAppointments,
  getAppointment,
  approveAppointment,
  rejectAppointment,
  cancelAppointment,
  deleteAppointment,
  updateAppointment,
  getAppointmentStats
} = require('../controllers/appointmentController');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');
const uploadPhotoCloudinary = require('../middleware/uploadPhotoCloudinary');

// 1. Public Routes
router.post('/public', uploadPhotoCloudinary.single('photo'), createAppointmentPublic);
router.get('/visitor/:visitorId', getAppointmentsByVisitor);

// 2. Auth Middleware
router.use(auth);

// 3. Specific Routes (MUST BE ABOVE /:id)
router.get('/my', getMyAppointments); // Cleaned up line 28
router.get('/stats', getAppointmentStats);

// 4. General Routes
router.post('/', uploadPhotoCloudinary.single('photo'), createAppointment);
router.get('/', checkRole('admin', 'employee'), getAllAppointments);

// 5. Parameterized Routes (/:id)
router.get('/:id', getAppointment);
router.patch('/:id', updateAppointment);
router.delete('/:id', checkRole('admin', 'employee', 'visitor'), deleteAppointment);

// 6. Action Routes
router.patch('/:id/approve', checkRole('admin', 'employee'), approveAppointment);
router.patch('/:id/reject', checkRole('admin', 'employee'), rejectAppointment);
router.patch('/:id/cancel', checkRole('admin', 'employee', 'visitor'), cancelAppointment);

module.exports = router;