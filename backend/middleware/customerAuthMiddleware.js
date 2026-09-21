// middleware/customerAuthMiddleware.js
// Verifies customer-portal JWT token (must have tokenType: "customer")
// Completely separate from staff authMiddleware

const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

/**
 * Middleware to protect read-only customer portal routes
 */
const customerAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Customer authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in server environment variables');
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Enforce strict tokenType: "customer" boundary
    if (decoded.tokenType !== 'customer' || !decoded.customerId) {
      return res.status(403).json({
        error: 'Invalid customer token. Ye token customer portal ke liye mutabiq nahi hai.',
      });
    }

    // Verify customer exists and is not deleted in database
    const customer = await Customer.findOne({ _id: decoded.customerId, isDeleted: { $ne: true } }).populate('userId', 'name phone');
    if (!customer) {
      return res.status(404).json({ error: 'Customer account not found or deactivated' });
    }

    req.customerId = decoded.customerId;
    req.shopId = decoded.shopId;
    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Customer session expired or invalid. Barah-e-karam dobara login karein.' });
  }
};

module.exports = customerAuthMiddleware;
