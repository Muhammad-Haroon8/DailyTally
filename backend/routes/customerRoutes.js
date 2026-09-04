// routes/customerRoutes.js
// Protected routes for Customer (Gahak) management

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all customer routes with JWT authentication
router.use(authMiddleware);

// POST /api/customers - Create a new customer
router.post('/', customerController.createCustomer);

// GET /api/customers - Get all customers (supports ?search=)
router.get('/', customerController.getCustomers);

// GET /api/customers/:id - Get a single customer by ID
router.get('/:id', customerController.getCustomerById);

// PUT /api/customers/:id - Update customer name/phone
router.put('/:id', customerController.updateCustomer);

// DELETE /api/customers/:id - Delete a customer
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
