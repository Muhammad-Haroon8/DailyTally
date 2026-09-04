// routes/itemRoutes.js
// Protected routes for Item Master management

const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all item routes with JWT authentication
router.use(authMiddleware);

// POST /api/items - Create a new item
router.post('/', itemController.createItem);

// GET /api/items - Get all items for the logged-in user
router.get('/', itemController.getItems);

// GET /api/items/:id - Get a single item by ID
router.get('/:id', itemController.getItemById);

// PUT /api/items/:id - Update item name and/or defaultRate
router.put('/:id', itemController.updateItem);

// DELETE /api/items/:id - Delete an item
router.delete('/:id', itemController.deleteItem);

module.exports = router;
