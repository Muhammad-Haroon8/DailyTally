// routes/authRoutes.js
// Authentication routes for Karobar Hisab

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/signup - Register a new user
router.post('/signup', authController.signup);

// POST /api/auth/login - Log in an existing user
router.post('/login', authController.login);

// GET /api/auth/me - Get current user profile
router.get('/me', authMiddleware, authController.getMe);

// PUT /api/auth/profile - Update name and phone only (email immutable)
router.put('/profile', authMiddleware, authController.updateProfile);

// PUT /api/auth/change-password - Change user password
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;

