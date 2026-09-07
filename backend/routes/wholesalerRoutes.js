// routes/wholesalerRoutes.js
// Protected routes for Wholesaler management

const express = require('express');
const router = express.Router();
const wholesalerController = require('../controllers/wholesalerController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// POST /api/wholesalers - Create a new wholesaler
router.post('/', wholesalerController.createWholesaler);

// GET /api/wholesalers/analytics/summary - Aggregated summary
router.get('/analytics/summary', wholesalerController.getWholesalerAnalyticsSummary);

// GET /api/wholesalers - Get all wholesalers (supports ?search=)
router.get('/', wholesalerController.getWholesalers);

// GET /api/wholesalers/:id - Get a single wholesaler by ID
router.get('/:id', wholesalerController.getWholesalerById);

// PUT /api/wholesalers/:id - Update wholesaler name/phone
router.put('/:id', wholesalerController.updateWholesaler);

// DELETE /api/wholesalers/:id - Delete a wholesaler
router.delete('/:id', wholesalerController.deleteWholesaler);

module.exports = router;
