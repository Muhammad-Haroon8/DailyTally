// middleware/authMiddleware.js
// Verifies JWT token from Authorization header and attaches userId to request

const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes that require authentication
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in server environment variables');
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject customer tokens from accessing staff endpoints
    if (decoded.tokenType === 'customer' || !decoded.userId) {
      return res.status(403).json({
        error: 'Access denied. Customer portal tokens cannot access staff endpoints.',
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
};

module.exports = authMiddleware;
