// routes/wholesalerReportRoutes.js
// Routes for Wholesaler PDF report statements

const express = require('express');
const router = express.Router();
const wholesalerReportController = require('../controllers/wholesalerReportController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all report routes with JWT authentication
router.use(authMiddleware);

// GET /api/wholesalers/:wholesalerId/report/pdf - Generate Wholesaler PDF statement
router.get('/wholesalers/:wholesalerId/report/pdf', wholesalerReportController.generateWholesalerReportPdf);

module.exports = router;
