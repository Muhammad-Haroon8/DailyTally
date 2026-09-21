// controllers/customerController.js
// Customer CRUD controllers scoped strictly to req.userId with balance aggregation
// Soft-delete enabled with permanent AuditLog tracking

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Entry = require('../models/Entry');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Creates a new customer for the logged-in user
 * POST /api/customers
 */
const createCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const customer = await Customer.create({
      userId: req.userId,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
    });

    return res.status(201).json({
      ...customer.toObject(),
      balance: 0,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ error: 'Server error while creating customer' });
  }
};

/**
 * Returns all customers belonging to req.userId with calculated balance, sorted alphabetically
 * Only returns active non-deleted customers
 * Supports ?search= query param for case-insensitive partial match
 * GET /api/customers
 */
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const matchQuery = {
      userId: new mongoose.Types.ObjectId(req.userId),
      isDeleted: { $ne: true },
    };

    if (search && search.trim()) {
      matchQuery.name = { $regex: search.trim(), $options: 'i' };
    }

    // Aggregation pipeline to join active entries and compute net balance for each customer
    const customers = await Customer.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'entries',
          let: { custId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$customerId', '$$custId'] },
                isDeleted: { $ne: true },
              },
            },
          ],
          as: 'customerEntries',
        },
      },
      {
        $addFields: {
          totalUdhaar: {
            $sum: {
              $map: {
                input: '$customerEntries',
                as: 'e',
                in: {
                  $cond: [
                    { $eq: ['$$e.type', 'item'] },
                    '$$e.amount',
                    0,
                  ],
                },
              },
            },
          },
          totalWasool: {
            $sum: {
              $map: {
                input: '$customerEntries',
                as: 'e',
                in: {
                  $cond: [
                    { $eq: ['$$e.type', 'payment'] },
                    '$$e.amount',
                    0,
                  ],
                },
              },
            },
          },
          balance: {
            $sum: {
              $map: {
                input: '$customerEntries',
                as: 'e',
                in: {
                  $cond: [
                    { $eq: ['$$e.type', 'item'] },
                    '$$e.amount',
                    { $multiply: ['$$e.amount', -1] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          customerEntries: 0,
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);

    return res.status(200).json(customers);
  } catch (error) {
    console.error('Error fetching customers with balance:', error);
    return res.status(500).json({ error: 'Server error while fetching customers' });
  }
};

/**
 * Returns a single customer by ID (only if belonging to req.userId and not deleted) including current balance
 * GET /api/customers/:id
 */
const getCustomerById = async (req, res) => {
  try {
    const customerId = new mongoose.Types.ObjectId(req.params.id);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const result = await Customer.aggregate([
      {
        $match: {
          _id: customerId,
          userId: userId,
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: 'entries',
          let: { custId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$customerId', '$$custId'] },
                isDeleted: { $ne: true },
              },
            },
          ],
          as: 'customerEntries',
        },
      },
      {
        $addFields: {
          totalUdhaar: {
            $sum: {
              $map: {
                input: '$customerEntries',
                as: 'e',
                in: {
                  $cond: [
                    { $eq: ['$$e.type', 'item'] },
                    '$$e.amount',
                    0,
                  ],
                },
              },
            },
          },
          totalWasool: {
            $sum: {
              $map: {
                input: '$customerEntries',
                as: 'e',
                in: {
                  $cond: [
                    { $eq: ['$$e.type', 'payment'] },
                    '$$e.amount',
                    0,
                  ],
                },
              },
            },
          },
          balance: {
            $sum: {
              $map: {
                input: '$customerEntries',
                as: 'e',
                in: {
                  $cond: [
                    { $eq: ['$$e.type', 'item'] },
                    '$$e.amount',
                    { $multiply: ['$$e.amount', -1] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          customerEntries: 0,
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json(result[0]);
  } catch (error) {
    console.error('Error fetching customer by id:', error);
    return res.status(500).json({ error: 'Server error while fetching customer' });
  }
};

/**
 * Updates name and phone of a customer (only if belonging to req.userId and not deleted)
 * PUT /api/customers/:id
 */
const updateCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name cannot be empty' });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, isDeleted: { $ne: true } },
      {
        name: name.trim(),
        phone: phone !== undefined ? phone.trim() : '',
      },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ error: 'Server error while updating customer' });
  }
};

/**
 * Soft-deletes a customer (only if belonging to req.userId)
 * Captures snapshot into AuditLog
 * DELETE /api/customers/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: { $ne: true },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const snapshot = customer.toObject();

    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.deletedBy = req.userId;
    await customer.save();

    // Fetch user for name snapshot
    const user = await User.findById(req.userId).select('name');

    // Create AuditLog record
    await AuditLog.create({
      shopId: req.userId,
      performedByUserId: req.userId,
      performedByUserName: user?.name || 'Unknown User',
      action: 'delete',
      entityType: 'Customer',
      entityId: customer._id,
      entitySnapshot: snapshot,
      timestamp: new Date(),
    });

    return res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ error: 'Server error while deleting customer' });
  }
};

/**
 * Returns aggregated shop-wide analytics: Kul Udhaar, Kul Wasool, and Kul Baqaya
 * across all active non-deleted customers belonging to req.userId
 * GET /api/customers/analytics/summary
 */
const getAnalyticsSummary = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const result = await Customer.aggregate([
      // 1. Match only active customers belonging to this user / shop
      { $match: { userId: userObjectId, isDeleted: { $ne: true } } },

      // 2. Lookup all active entries for each of these customers
      {
        $lookup: {
          from: 'entries',
          let: { custId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$customerId', '$$custId'] },
                isDeleted: { $ne: true },
              },
            },
          ],
          as: 'customerEntries',
        },
      },

      // 3. Unwind entries to process them in aggregate
      { $unwind: '$customerEntries' },

      // 4. Group all entries across all customers for this user
      {
        $group: {
          _id: null,
          totalUdhaar: {
            $sum: {
              $cond: [{ $eq: ['$customerEntries.type', 'item'] }, '$customerEntries.amount', 0],
            },
          },
          totalWasool: {
            $sum: {
              $cond: [{ $eq: ['$customerEntries.type', 'payment'] }, '$customerEntries.amount', 0],
            },
          },
        },
      },

      // 5. Project totals and compute totalBaqaya
      {
        $project: {
          _id: 0,
          totalUdhaar: { $round: ['$totalUdhaar', 2] },
          totalWasool: { $round: ['$totalWasool', 2] },
          totalBaqaya: { $round: [{ $subtract: ['$totalUdhaar', '$totalWasool'] }, 2] },
        },
      },
    ]);

    if (result && result.length > 0) {
      return res.status(200).json(result[0]);
    }

    return res.status(200).json({
      totalUdhaar: 0,
      totalWasool: 0,
      totalBaqaya: 0,
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return res.status(500).json({ error: 'Server error while fetching analytics summary' });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getAnalyticsSummary,
};
