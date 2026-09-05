// controllers/customerController.js
// Customer CRUD controllers scoped strictly to req.userId with balance aggregation

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Entry = require('../models/Entry');

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
 * Supports ?search= query param for case-insensitive partial match
 * GET /api/customers
 */
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const matchQuery = { userId: new mongoose.Types.ObjectId(req.userId) };

    if (search && search.trim()) {
      matchQuery.name = { $regex: search.trim(), $options: 'i' };
    }

    // Aggregation pipeline to join entries and compute net balance for each customer
    const customers = await Customer.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'entries',
          localField: '_id',
          foreignField: 'customerId',
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
 * Returns a single customer by ID (only if belonging to req.userId) including current balance
 * GET /api/customers/:id
 */
const getCustomerById = async (req, res) => {
  try {
    const customerId = new mongoose.Types.ObjectId(req.params.id);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const result = await Customer.aggregate([
      { $match: { _id: customerId, userId: userId } },
      {
        $lookup: {
          from: 'entries',
          localField: '_id',
          foreignField: 'customerId',
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
 * Updates name and phone of a customer (only if belonging to req.userId)
 * PUT /api/customers/:id
 */
const updateCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name cannot be empty' });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
 * Deletes a customer (only if belonging to req.userId)
 * DELETE /api/customers/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ error: 'Server error while deleting customer' });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
