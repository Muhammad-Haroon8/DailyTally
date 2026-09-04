// models/Entry.js
// Mongoose schema for credit (Udhaar) and payment (Wasool) entries

const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['item', 'payment'],
      required: true,
    },
    // Applicable when type === 'item'
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: function () {
        return this.type === 'item';
      },
    },
    itemName: {
      type: String,
      required: function () {
        return this.type === 'item';
      },
    },
    quantity: {
      type: Number,
      required: function () {
        return this.type === 'item';
      },
      min: [0.01, 'Quantity must be greater than 0'],
    },
    rate: {
      type: Number,
      required: function () {
        return this.type === 'item';
      },
      min: [0, 'Rate cannot be negative'],
    },
    // Final monetary value:
    // for 'item': quantity * rate (always calculated server-side)
    // for 'payment': payment amount collected
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be non-negative'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    entryTime: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to optimize range and opening-balance queries for report generation
entrySchema.index({ customerId: 1, entryDate: 1 });

module.exports = mongoose.model('Entry', entrySchema);
