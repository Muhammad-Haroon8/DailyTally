// controllers/entryController.js
// Controller for creating, reading, updating, and deleting customer entries (item credit + payment wasool)

const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const Customer = require('../models/Customer');
const Item = require('../models/Item');

/**
 * Calculates net balance for a customer:
 * SUM(amount where type='item') - SUM(amount where type='payment')
 * @param {string|ObjectId} customerId
 * @returns {Promise<number>} Net balance
 */
const getCustomerBalance = async (customerId) => {
  const objectId = new mongoose.Types.ObjectId(customerId);

  const result = await Entry.aggregate([
    { $match: { customerId: objectId } },
    {
      $group: {
        _id: null,
        totalItems: {
          $sum: {
            $cond: [{ $eq: ['$type', 'item'] }, '$amount', 0],
          },
        },
        totalPayments: {
          $sum: {
            $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ['$totalItems', '$totalPayments'] },
      },
    },
  ]);

  return result.length > 0 ? result[0].balance : 0;
};

/**
 * Creates an entry (item credit or payment) for a customer
 * Strictly enforces server-side amount calculation for items
 * POST /api/entries
 */
const createEntry = async (req, res) => {
  try {
    const {
      customerId,
      type,
      itemId,
      quantity,
      rate,
      amount: rawPaymentAmount,
      note,
      entryDate,
      entryTime,
    } = req.body;

    // 1. Validate Customer ownership
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      userId: req.userId,
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or unauthorized' });
    }

    // 2. Validate Type
    if (!type || !['item', 'payment'].includes(type)) {
      return res.status(400).json({ error: 'Entry type must be either "item" or "payment"' });
    }

    let calculatedAmount = 0;
    let itemName = '';
    let parsedQty = 0;
    let parsedRate = 0;

    if (type === 'item') {
      if (!itemId) {
        return res.status(400).json({ error: 'Item selection is required for item entries' });
      }

      // Verify item exists and belongs to user
      const item = await Item.findOne({ _id: itemId, userId: req.userId });
      if (!item) {
        return res.status(404).json({ error: 'Item not found in master catalog' });
      }

      parsedQty = Number(quantity);
      parsedRate = Number(rate);

      if (isNaN(parsedQty) || parsedQty <= 0) {
        return res.status(400).json({ error: 'Quantity must be a number greater than 0' });
      }

      if (isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({ error: 'Rate must be a non-negative number' });
      }

      // CRITICAL SECURITY RULE: Calculate amount server-side
      calculatedAmount = Math.round(parsedQty * parsedRate * 100) / 100;
      itemName = item.name;
    } else {
      // Payment type
      calculatedAmount = Number(rawPaymentAmount);
      if (isNaN(calculatedAmount) || calculatedAmount <= 0) {
        return res.status(400).json({ error: 'Payment amount must be greater than 0' });
      }
    }

    // Create Entry
    const newEntry = await Entry.create({
      customerId: customer._id,
      type,
      itemId: type === 'item' ? itemId : undefined,
      itemName: type === 'item' ? itemName : undefined,
      quantity: type === 'item' ? parsedQty : undefined,
      rate: type === 'item' ? parsedRate : undefined,
      amount: calculatedAmount,
      note: note ? note.trim() : '',
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      entryTime: entryTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // Compute updated balance for customer
    const newBalance = await getCustomerBalance(customer._id);

    return res.status(201).json({
      entry: newEntry,
      balance: newBalance,
    });
  } catch (error) {
    console.error('Error creating entry:', error);
    return res.status(500).json({ error: 'Server error while creating entry' });
  }
};

/**
 * Returns all entries for a specific customer, grouped by month with running opening and closing balances.
 * Sorted chronologically for balance calculation, then grouped and returned newest-month-first.
 * Empty months with 0 transactions are skipped entirely.
 * GET /api/customers/:customerId/entries
 */
const getEntriesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Verify customer belongs to req.userId
    const customer = await Customer.findOne({
      _id: customerId,
      userId: req.userId,
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or unauthorized' });
    }

    // Fetch all entries for this customer in chronological order (oldest first)
    // to accurately compute cumulative running balances across months
    const allEntries = await Entry.find({ customerId: customer._id }).sort({
      entryDate: 1,
      createdAt: 1,
    });

    // 1. Group entries chronologically by month key "YYYY-MM"
    const monthMap = new Map();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    allEntries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      const year = d.getFullYear();
      const monthNum = d.getMonth(); // 0-indexed
      const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          year,
          monthIndex: monthNum,
          monthLabel: `${monthNames[monthNum]} ${year}`,
          entries: [],
          monthNet: 0,
          monthUdhaar: 0,
          monthWasool: 0,
        });
      }

      const monthGroup = monthMap.get(monthKey);
      monthGroup.entries.push(entry);

      if (entry.type === 'item') {
        monthGroup.monthNet += entry.amount;
        monthGroup.monthUdhaar += entry.amount;
      } else {
        monthGroup.monthNet -= entry.amount;
        monthGroup.monthWasool += entry.amount;
      }
    });

    // 2. Sort months chronologically (oldest to newest) to chain opening -> closing balances
    const chronologicalMonths = Array.from(monthMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    let runningBalance = 0;
    const processedMonths = chronologicalMonths.map((m) => {
      const openingBalance = Math.round(runningBalance * 100) / 100;
      const monthNet = Math.round(m.monthNet * 100) / 100;
      const closingBalance = Math.round((openingBalance + monthNet) * 100) / 100;

      // Update running balance for subsequent months
      runningBalance = closingBalance;

      // Within each month, sort entries newest first for display
      const displayEntries = [...m.entries].reverse();

      return {
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        openingBalance,
        monthNet,
        monthUdhaar: Math.round(m.monthUdhaar * 100) / 100,
        monthWasool: Math.round(m.monthWasool * 100) / 100,
        closingBalance,
        entries: displayEntries,
      };
    });

    // 3. For display on mobile: reverse so newest month is first
    const monthsNewestFirst = [...processedMonths].reverse();

    // Compute overall customer lifetime Udhaar & Wasool
    let customerTotalUdhaar = 0;
    let customerTotalWasool = 0;
    allEntries.forEach((entry) => {
      if (entry.type === 'item') {
        customerTotalUdhaar += entry.amount;
      } else {
        customerTotalWasool += entry.amount;
      }
    });
    customerTotalUdhaar = Math.round(customerTotalUdhaar * 100) / 100;
    customerTotalWasool = Math.round(customerTotalWasool * 100) / 100;

    const overallBalance = await getCustomerBalance(customer._id);

    return res.status(200).json({
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        totalUdhaar: customerTotalUdhaar,
        totalWasool: customerTotalWasool,
        balance: overallBalance,
      },
      months: monthsNewestFirst,
      entries: allEntries.slice().reverse(), // backward compatibility if needed
    });
  } catch (error) {
    console.error('Error fetching entries:', error);
    return res.status(500).json({ error: 'Server error while fetching entries' });
  }
};

/**
 * Updates an entry
 * PUT /api/entries/:id
 */
const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemId,
      quantity,
      rate,
      amount: rawAmount,
      note,
      entryDate,
      entryTime,
    } = req.body;

    const entry = await Entry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Verify customer ownership
    const customer = await Customer.findOne({
      _id: entry.customerId,
      userId: req.userId,
    });

    if (!customer) {
      return res.status(404).json({ error: 'Unauthorized entry access' });
    }

    // Update based on type
    if (entry.type === 'item') {
      if (itemId && itemId !== String(entry.itemId)) {
        const item = await Item.findOne({ _id: itemId, userId: req.userId });
        if (!item) {
          return res.status(404).json({ error: 'Item not found in master catalog' });
        }
        entry.itemId = item._id;
        entry.itemName = item.name;
      }

      if (quantity !== undefined) {
        const parsedQty = Number(quantity);
        if (isNaN(parsedQty) || parsedQty <= 0) {
          return res.status(400).json({ error: 'Quantity must be greater than 0' });
        }
        entry.quantity = parsedQty;
      }

      if (rate !== undefined) {
        const parsedRate = Number(rate);
        if (isNaN(parsedRate) || parsedRate < 0) {
          return res.status(400).json({ error: 'Rate must be a non-negative number' });
        }
        entry.rate = parsedRate;
      }

      // Recalculate amount server-side
      entry.amount = Math.round(entry.quantity * entry.rate * 100) / 100;
    } else {
      // Payment type
      if (rawAmount !== undefined) {
        const parsedAmount = Number(rawAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        }
        entry.amount = parsedAmount;
      }
    }

    if (note !== undefined) {
      entry.note = note ? note.trim() : '';
    }

    if (entryDate) {
      entry.entryDate = new Date(entryDate);
    }

    if (entryTime) {
      entry.entryTime = entryTime;
    }

    await entry.save();

    const updatedBalance = await getCustomerBalance(entry.customerId);

    return res.status(200).json({
      entry,
      balance: updatedBalance,
    });
  } catch (error) {
    console.error('Error updating entry:', error);
    return res.status(500).json({ error: 'Server error while updating entry' });
  }
};

/**
 * Deletes an entry
 * DELETE /api/entries/:id
 */
const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await Entry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Verify ownership via customer
    const customer = await Customer.findOne({
      _id: entry.customerId,
      userId: req.userId,
    });

    if (!customer) {
      return res.status(404).json({ error: 'Unauthorized entry access' });
    }

    const customerId = entry.customerId;
    await Entry.findByIdAndDelete(id);

    const updatedBalance = await getCustomerBalance(customerId);

    return res.status(200).json({
      message: 'Entry deleted successfully',
      balance: updatedBalance,
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return res.status(500).json({ error: 'Server error while deleting entry' });
  }
};

module.exports = {
  getCustomerBalance,
  createEntry,
  getEntriesByCustomer,
  updateEntry,
  deleteEntry,
};
