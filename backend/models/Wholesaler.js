// models/Wholesaler.js
// Mongoose schema for Wholesaler / Supplier (Saudagar) in Karobar Hisab

const mongoose = require('mongoose');

const wholesalerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Wholesaler name is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Wholesaler', wholesalerSchema);
