// routes/customerPortalRoutes.js
// Read-only customer portal routes protected strictly by customerAuthMiddleware

const express = require('express');
const router = express.Router();
const customerAuthMiddleware = require('../middleware/customerAuthMiddleware');
const {
  getCustomerProfileAndSummary,
  getCustomerPortalEntries,
  getCustomerPortalPdf,
} = require('../controllers/customerPortalController');

// All routes in this file are protected by customerAuthMiddleware
router.use(customerAuthMiddleware);

// GET /api/customer-portal/me - Customer profile & lifetime summary
router.get('/me', getCustomerProfileAndSummary);

// GET /api/customer-portal/entries - Full history grouped by months
router.get('/entries', getCustomerPortalEntries);

// GET /api/customer-portal/report/pdf - Customer statement PDF
router.get('/report/pdf', getCustomerPortalPdf);

module.exports = router;
