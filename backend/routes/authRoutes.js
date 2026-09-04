// routes/authRoutes.js
// Authentication routes for Karobar Hisab

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/signup - Register a new user
router.post('/signup', authController.signup);

// POST /api/auth/login - Log in an existing user
router.post('/login', authController.login);

module.exports = router;
