// controllers/superAdminAuthController.js
// Authentication for platform-level Super Admin accounts
// Issues JWTs with distinct payload { superAdminId, tokenType: "superadmin" }

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

/**
 * Super Admin Login
 * POST /api/super-admin/login
 * Body: { email: string, password: string }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Look up Super Admin
    const superAdmin = await SuperAdmin.findOne({ email: trimmedEmail });
    if (!superAdmin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, superAdmin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET missing in environment');
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }

    // Issue JWT strictly scoped to superadmin
    const token = jwt.sign(
      {
        superAdminId: superAdmin._id,
        tokenType: 'superadmin',
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      token,
      superAdmin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        createdAt: superAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error('Super Admin login error:', error);
    return res.status(500).json({ error: 'Server error during Super Admin login' });
  }
};

module.exports = {
  login,
};
