// middleware/superAdminMiddleware.js
// Verifies platform-level super admin JWT token (must have tokenType: "superadmin")
// Strictly mutually exclusive from staff authMiddleware and customerAuthMiddleware

const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

/**
 * Middleware to protect Super Admin routes
 */
const superAdminMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Super Admin authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in server environment variables');
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Enforce strict tokenType: "superadmin" boundary
    if (decoded.tokenType !== 'superadmin' || !decoded.superAdminId) {
      return res.status(403).json({
        error: 'Access denied. Super Admin privileges required.',
      });
    }

    // Verify Super Admin account exists in database
    const superAdmin = await SuperAdmin.findById(decoded.superAdminId).select('-passwordHash');
    if (!superAdmin) {
      return res.status(403).json({ error: 'Super Admin account not found or access revoked' });
    }

    req.superAdminId = decoded.superAdminId;
    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired Super Admin token' });
  }
};

module.exports = superAdminMiddleware;
