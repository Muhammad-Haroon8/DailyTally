// models/AuditLog.js
// Permanent audit trail for destructive actions across Daily Tally

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  performedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  performedByUserName: {
    type: String,
    default: '',
    trim: true,
  },
  action: {
    type: String,
    enum: ['delete'],
    default: 'delete',
    required: true,
  },
  entityType: {
    type: String,
    enum: ['Customer', 'Item', 'Entry', 'Wholesaler', 'WholesalerItem', 'WholesalerEntry'],
    required: true,
    index: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  entitySnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
