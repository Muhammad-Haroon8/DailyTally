// routes/wholesalerItemRoutes.js
// Protected routes for Wholesaler Purchase Item Master

const express = require('express');
const router = express.Router();
const wholesalerItemController = require('../controllers/wholesalerItemController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all wholesaler item routes with JWT authentication
router.use(authMiddleware);

// POST /api/wholesaler-items - Create a new wholesaler item
router.post('/', wholesalerItemController.createWholesalerItem);

// GET /api/wholesaler-items - Get all wholesaler items for the logged-in user
router.get('/', wholesalerItemController.getWholesalerItems);

// GET /api/wholesaler-items/:id - Get a single wholesaler item by ID
router.get('/:id', wholesalerItemController.getWholesalerItemById);

// PUT /api/wholesaler-items/:id - Update wholesaler item name and/or defaultRate
router.put('/:id', wholesalerItemController.updateWholesalerItem);

// DELETE /api/wholesaler-items/:id - Delete a wholesaler item
router.delete('/:id', wholesalerItemController.deleteWholesalerItem);

module.exports = router;
