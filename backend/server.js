// server.js
// Main entry point for Karobar Hisab Express backend

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection middleware for serverless execution
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Failed to establish database connection:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const itemRoutes = require('./routes/itemRoutes');
const entryRoutes = require('./routes/entryRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Karobar Hisab backend is live and operational'
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Customer Routes (Protected)
app.use('/api/customers', customerRoutes);

// Item Master Routes (Protected)
app.use('/api/items', itemRoutes);

// Entry Routes (Protected)
app.use('/api', entryRoutes);

// Report Routes (Protected)
app.use('/api', reportRoutes);

// Port configuration
const PORT = process.env.PORT || 5000;

// Start server locally only if executed directly (not imported as a serverless module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Karobar Hisab backend server running on port ${PORT}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;
