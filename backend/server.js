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
const wholesalerRoutes = require('./routes/wholesalerRoutes');
const itemRoutes = require('./routes/itemRoutes');
const wholesalerItemRoutes = require('./routes/wholesalerItemRoutes');
const entryRoutes = require('./routes/entryRoutes');
const wholesalerEntryRoutes = require('./routes/wholesalerEntryRoutes');
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

// Wholesaler Routes (Protected)
app.use('/api/wholesalers', wholesalerRoutes);

// Item Master Routes (Protected) - Customer items
app.use('/api/items', itemRoutes);

// Wholesaler Item Master Routes (Protected) - Wholesaler items
app.use('/api/wholesaler-items', wholesalerItemRoutes);

// Entry Routes (Protected)
app.use('/api', entryRoutes);

// Wholesaler Entry Routes (Protected)
app.use('/api', wholesalerEntryRoutes);

// Report Routes (Protected)
app.use('/api', reportRoutes);

// Wholesaler Report Routes (Protected)
const wholesalerReportRoutes = require('./routes/wholesalerReportRoutes');
app.use('/api', wholesalerReportRoutes);

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
