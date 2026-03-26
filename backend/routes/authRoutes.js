const express = require('express');
const router = express.Router();

const {
  loginUser,
  signupUser,
  getProfile,
  updateProfile,
  getAllUsers,
  getHosts,
  updateUserRole,
  deleteUser,
  createUser
} = require('../controllers/authController');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/roleCheck');

// Public routes
router.post('/login', loginUser);
router.post('/signup', signupUser);

// Public route to fetch hosts (employees/admins) for appointment forms
router.get('/hosts', getHosts);

// Protected routes
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

// Admin routes
router.get('/users', auth, checkRole('admin'), getAllUsers);
router.post('/create-user', auth, checkRole('admin'), createUser);
router.put('/users/:id/role', auth, checkRole('admin'), updateUserRole);
router.delete('/users/:id', auth, checkRole('admin'), deleteUser);

module.exports = router;
