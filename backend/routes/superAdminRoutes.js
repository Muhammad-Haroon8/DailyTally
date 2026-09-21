// routes/superAdminRoutes.js
// Express routes for Super Admin authentication and platform-level oversight APIs

const express = require('express');
const router = express.Router();

const superAdminAuthController = require('../controllers/superAdminAuthController');
const superAdminController = require('../controllers/superAdminController');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');

// Public route: Super Admin Login
router.post('/login', superAdminAuthController.login);

// Protected routes: All require superAdminMiddleware
router.use(superAdminMiddleware);

// Shops overview
router.get('/shops', superAdminController.getShops);

// Shop-specific customers (including soft-deleted)
router.get('/shops/:shopId/customers', superAdminController.getShopCustomers);

// Customer full entry history & details across all shops
router.get('/customers/:customerId', superAdminController.getCustomerDetailsAndHistory);

// Shop-specific wholesalers (including soft-deleted)
router.get('/shops/:shopId/wholesalers', superAdminController.getShopWholesalers);

// Wholesaler full entry history & details across all shops
router.get('/wholesalers/:wholesalerId', superAdminController.getWholesalerDetailsAndHistory);

// Audit logs with filters (?shopId, ?userId, ?entityType, ?startDate, ?endDate)
router.get('/audit-log', superAdminController.getAuditLogs);

// Single entity audit history
router.get('/audit-log/:entityId', superAdminController.getEntityAuditHistory);

module.exports = router;
