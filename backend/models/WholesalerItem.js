// models/WholesalerItem.js
// Mongoose schema for Wholesaler Purchase Item Master (separate from Customer-facing Item model)

const mongoose = require('mongoose');

const wholesalerItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Wholesaler item name is required'],
    trim: true,
  },
  defaultRate: {
    type: Number,
    required: [true, 'Default purchase rate is required'],
    default: 0,
    min: [0, 'Default rate cannot be negative'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WholesalerItem', wholesalerItemSchema);
