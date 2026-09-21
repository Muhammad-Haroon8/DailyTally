// routes/customerAuthRoutes.js
// Express routes for customer authentication (phone-only login)

const express = require('express');
const router = express.Router();
const { customerLogin } = require('../controllers/customerAuthController');

// Customer Phone Login
router.post('/login', customerLogin);

module.exports = router;
