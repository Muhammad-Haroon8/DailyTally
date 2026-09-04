// routes/entryRoutes.js
// Routes for entries (item credit and payments)

const express = require('express');
const router = express.Router();
const entryController = require('../controllers/entryController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all entry routes with JWT authentication
router.use(authMiddleware);

// POST /api/entries - Create an entry (item or payment)
router.post('/entries', entryController.createEntry);

// GET /api/customers/:customerId/entries - Get all entries and balance for a customer
router.get('/customers/:customerId/entries', entryController.getEntriesByCustomer);

// PUT /api/entries/:id - Update an entry
router.put('/entries/:id', entryController.updateEntry);

// DELETE /api/entries/:id - Delete an entry
router.delete('/entries/:id', entryController.deleteEntry);

module.exports = router;
