// models/SuperAdmin.js
// Mongoose schema for platform-level Super Admin accounts
// Deliberately a separate collection from User for strict security isolation

const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Super Admin name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Super Admin email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
