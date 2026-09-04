// models/Item.js
// Mongoose schema for Item Master (meat/grocery item types with default rates)

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  defaultRate: {
    type: Number,
    required: [true, 'Default rate is required'],
    default: 0,
    min: [0, 'Default rate cannot be negative'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Item', itemSchema);
