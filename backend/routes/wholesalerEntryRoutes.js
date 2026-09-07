// routes/wholesalerEntryRoutes.js
// Routes for wholesaler entries (purchase and payment)

const express = require('express');
const router = express.Router();
const wholesalerEntryController = require('../controllers/wholesalerEntryController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// POST /api/wholesaler-entries - Create a wholesaler entry
router.post('/wholesaler-entries', wholesalerEntryController.createWholesalerEntry);

// GET /api/wholesalers/:wholesalerId/entries - Get all entries and balance for a wholesaler
router.get('/wholesalers/:wholesalerId/entries', wholesalerEntryController.getEntriesByWholesaler);

// PUT /api/wholesaler-entries/:id - Update an entry
router.put('/wholesaler-entries/:id', wholesalerEntryController.updateWholesalerEntry);

// DELETE /api/wholesaler-entries/:id - Delete an entry
router.delete('/wholesaler-entries/:id', wholesalerEntryController.deleteWholesalerEntry);

module.exports = router;
