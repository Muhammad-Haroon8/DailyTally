// models/WholesalerEntry.js
// Mongoose schema for Wholesaler purchase and payment entries

const mongoose = require('mongoose');

const wholesalerEntrySchema = new mongoose.Schema(
  {
    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wholesaler',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'payment', 'advance', 'advanceSettlement'],
      required: true,
    },
    // Applicable when type === 'purchase'
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WholesalerItem',
      required: function () {
        return this.type === 'purchase';
      },
    },
    itemName: {
      type: String,
      required: function () {
        return this.type === 'purchase';
      },
    },
    quantity: {
      type: Number,
      required: function () {
        return this.type === 'purchase';
      },
      min: [0.01, 'Quantity must be greater than 0'],
    },
    rate: {
      type: Number,
      required: function () {
        return this.type === 'purchase';
      },
      min: [0, 'Rate cannot be negative'],
    },
    baseAmount: {
      type: Number,
      required: function () {
        return this.type === 'purchase';
      },
    },
    // Multiple Extra Items: [{ itemId, itemName, pieces, rate, amount }]
    extraItems: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'WholesalerItem',
          required: true,
        },
        itemName: {
          type: String,
          required: true,
        },
        pieces: {
          type: Number,
          required: true,
          min: [0, 'Pieces cannot be negative'],
        },
        rate: {
          type: Number,
          required: true,
          min: [0, 'Rate cannot be negative'],
        },
        amount: {
          type: Number,
          required: true,
          min: [0, 'Amount cannot be negative'],
        },
      },
    ],
    // Multiple Shortage / Kam Items: [{ itemId, itemName, pieces, rate, amount }]
    shortageItems: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'WholesalerItem',
          required: true,
        },
        itemName: {
          type: String,
          required: true,
        },
        pieces: {
          type: Number,
          required: true,
          min: [0, 'Pieces cannot be negative'],
        },
        rate: {
          type: Number,
          required: true,
          min: [0, 'Rate cannot be negative'],
        },
        amount: {
          type: Number,
          required: true,
          min: [0, 'Amount cannot be negative'],
        },
      },
    ],
    extraAmount: {
      type: Number,
      default: 0,
      min: [0, 'Extra amount cannot be negative'],
    },
    shortageAmount: {
      type: Number,
      default: 0,
      min: [0, 'Shortage amount cannot be negative'],
    },
    // Final monetary value:
    // for 'purchase': baseAmount + extraAmount - shortageAmount
    // for 'payment': direct payment amount
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

wholesalerEntrySchema.index({ wholesalerId: 1, entryDate: 1 });

module.exports = mongoose.model('WholesalerEntry', wholesalerEntrySchema);
