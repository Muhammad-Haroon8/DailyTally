// routes/reportRoutes.js
// Routes for generating report statements and exports

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all report routes with JWT authentication
router.use(authMiddleware);

// GET /api/customers/:customerId/report/pdf - Generate PDF report statement
router.get('/customers/:customerId/report/pdf', reportController.generateCustomerReportPdf);

module.exports = router;
