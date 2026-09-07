// controllers/wholesalerEntryController.js
// Controller for creating, reading, updating, and deleting wholesaler purchase and payment entries

const mongoose = require('mongoose');
const WholesalerEntry = require('../models/WholesalerEntry');
const Wholesaler = require('../models/Wholesaler');
const WholesalerItem = require('../models/WholesalerItem');

/**
 * Calculates net balance for a wholesaler:
 * SUM(amount where type='purchase') - SUM(amount where type in ['payment', 'advanceSettlement'])
 */
const getWholesalerBalance = async (wholesalerId) => {
  const objectId = new mongoose.Types.ObjectId(wholesalerId);

  const result = await WholesalerEntry.aggregate([
    { $match: { wholesalerId: objectId } },
    {
      $group: {
        _id: null,
        totalPurchases: {
          $sum: {
            $cond: [{ $eq: ['$type', 'purchase'] }, '$amount', 0],
          },
        },
        totalPayments: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$type', 'payment'] }, { $eq: ['$type', 'advanceSettlement'] }] },
              '$amount',
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ['$totalPurchases', '$totalPayments'] },
      },
    },
  ]);

  return result.length > 0 ? Math.round(result[0].balance * 100) / 100 : 0;
};

/**
 * Calculates remaining advance pool for a wholesaler:
 * SUM(amount where type='advance') - SUM(amount where type='advanceSettlement')
 */
const getWholesalerAdvanceBaqi = async (wholesalerId) => {
  const objectId = new mongoose.Types.ObjectId(wholesalerId);

  const result = await WholesalerEntry.aggregate([
    { $match: { wholesalerId: objectId } },
    {
      $group: {
        _id: null,
        totalAdvances: {
          $sum: {
            $cond: [{ $eq: ['$type', 'advance'] }, '$amount', 0],
          },
        },
        totalSettlements: {
          $sum: {
            $cond: [{ $eq: ['$type', 'advanceSettlement'] }, '$amount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        advanceBaqi: { $subtract: ['$totalAdvances', '$totalSettlements'] },
      },
    },
  ]);

  return result.length > 0 ? Math.round(result[0].advanceBaqi * 100) / 100 : 0;
};

/**
 * Helper to process adjustment items array server-side:
 * For each item:
 * - validates itemId exists for user/shop in WholesalerItem catalog
 * - snaps itemName
 * - calculates amount = (pieces / 2) * rate
 * Returns sanitized array and sum
 */
const processAdjustmentItems = async (itemsArray, defaultRate, userId) => {
  if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
    return { sanitizedItems: [], totalAmount: 0 };
  }

  const sanitizedItems = [];
  let totalAmount = 0;

  for (const rawItem of itemsArray) {
    if (!rawItem || !rawItem.itemId) continue;

    const pieces = Math.max(0, Number(rawItem.pieces) || 0);
    if (pieces <= 0) continue;

    // Verify item in WholesalerItem catalog
    const wholesalerItem = await WholesalerItem.findOne({ _id: rawItem.itemId, userId });
    if (!wholesalerItem) {
      throw new Error(`Wholesaler item not found for ID: ${rawItem.itemId}`);
    }

    const rate =
      rawItem.rate !== undefined && rawItem.rate !== null && !isNaN(Number(rawItem.rate)) && Number(rawItem.rate) >= 0
        ? Number(rawItem.rate)
        : Number(wholesalerItem.defaultRate) || Number(defaultRate) || 0;

    // Arithmetic rule: (pieces / 2) * rate
    const amount = Math.round((pieces / 2) * rate * 100) / 100;

    sanitizedItems.push({
      itemId: wholesalerItem._id,
      itemName: wholesalerItem.name,
      pieces,
      rate,
      amount,
    });

    totalAmount += amount;
  }

  return {
    sanitizedItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
};

/**
 * Creates an entry (purchase or payment) for a wholesaler
 * POST /api/wholesaler-entries
 */
const createWholesalerEntry = async (req, res) => {
  try {
    const {
      wholesalerId,
      type,
      itemId,
      quantity,
      rate,
      extraItems: rawExtraItems,
      shortageItems: rawShortageItems,
      // Backwards compatibility for single extra/shortage inputs if sent
      extraPieces,
      extraRate,
      shortagePieces,
      shortageRate,
      amount: rawPaymentAmount,
      note,
      entryDate,
      entryTime,
    } = req.body;

    // 1. Validate Wholesaler ownership
    if (!wholesalerId) {
      return res.status(400).json({ error: 'Wholesaler ID is required' });
    }

    const wholesaler = await Wholesaler.findOne({
      _id: wholesalerId,
      userId: req.userId,
    });

    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found or unauthorized' });
    }

    // 2. Validate Type
    if (!type || !['purchase', 'payment', 'advance', 'advanceSettlement'].includes(type)) {
      return res.status(400).json({ error: 'Entry type must be "purchase", "payment", "advance", or "advanceSettlement"' });
    }

    let calculatedAmount = 0;
    let itemName = '';
    let parsedQty = 0;
    let parsedRate = 0;
    let baseAmount = 0;
    let finalExtraItems = [];
    let finalExtraAmount = 0;
    let finalShortageItems = [];
    let finalShortageAmount = 0;

    if (type === 'purchase') {
      if (!itemId) {
        return res.status(400).json({ error: 'Item ID is required for purchase entries' });
      }

      // Verify item belongs to user / shop in wholesaler items catalog
      const item = await WholesalerItem.findOne({ _id: itemId, userId: req.userId });
      if (!item) {
        return res.status(404).json({ error: 'Item not found in wholesaler catalog' });
      }

      itemName = item.name;

      if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
      }

      if (rate === undefined || isNaN(Number(rate)) || Number(rate) < 0) {
        return res.status(400).json({ error: 'Rate must be a non-negative number' });
      }

      parsedQty = Math.max(0, Number(quantity) || 0);
      parsedRate = Math.max(0, Number(rate) || 0);
      baseAmount = Math.round(parsedQty * parsedRate * 100) / 100;

      // Handle extra items (support array or single fallback)
      let incomingExtra = Array.isArray(rawExtraItems) ? rawExtraItems : [];
      if (incomingExtra.length === 0 && Number(extraPieces) > 0) {
        incomingExtra = [{
          itemId: item._id,
          pieces: Number(extraPieces),
          rate: extraRate !== undefined ? Number(extraRate) : parsedRate,
        }];
      }

      // Handle shortage items (support array or single fallback)
      let incomingShortage = Array.isArray(rawShortageItems) ? rawShortageItems : [];
      if (incomingShortage.length === 0 && Number(shortagePieces) > 0) {
        incomingShortage = [{
          itemId: item._id,
          pieces: Number(shortagePieces),
          rate: shortageRate !== undefined ? Number(shortageRate) : parsedRate,
        }];
      }

      const extraResult = await processAdjustmentItems(incomingExtra, parsedRate, req.userId);
      finalExtraItems = extraResult.sanitizedItems;
      finalExtraAmount = extraResult.totalAmount;

      const shortageResult = await processAdjustmentItems(incomingShortage, parsedRate, req.userId);
      finalShortageItems = shortageResult.sanitizedItems;
      finalShortageAmount = shortageResult.totalAmount;

      calculatedAmount = Math.round((baseAmount + finalExtraAmount - finalShortageAmount) * 100) / 100;
      if (calculatedAmount < 0) calculatedAmount = 0;
    } else if (type === 'advanceSettlement') {
      if (rawPaymentAmount === undefined || isNaN(Number(rawPaymentAmount)) || Number(rawPaymentAmount) <= 0) {
        return res.status(400).json({
          error: 'Adjustment amount must be greater than 0',
        });
      }
      calculatedAmount = Math.round(Number(rawPaymentAmount) * 100) / 100;

      // Validate available advance pool server-side
      const currentAdvanceBaqi = await getWholesalerAdvanceBaqi(wholesalerId);
      if (calculatedAmount > currentAdvanceBaqi) {
        return res.status(400).json({
          error: `Itna advance available nahi hai. Moujooda Advance Baqi: Rs. ${currentAdvanceBaqi.toLocaleString()}`,
        });
      }
    } else {
      // Payment or Advance type
      if (rawPaymentAmount === undefined || isNaN(Number(rawPaymentAmount)) || Number(rawPaymentAmount) <= 0) {
        return res.status(400).json({
          error: `${type === 'advance' ? 'Advance' : 'Payment'} amount must be greater than 0`,
        });
      }
    }

    // Validate entryDate if provided
    let parsedEntryDate = new Date();
    if (entryDate) {
      parsedEntryDate = new Date(entryDate);
      if (isNaN(parsedEntryDate.getTime())) {
        return res.status(400).json({ error: 'Valid entryDate is required' });
      }
    } else if (type === 'advanceSettlement') {
      return res.status(400).json({ error: 'entryDate is required for advance settlement' });
    }

    const entry = await WholesalerEntry.create({
      wholesalerId,
      userId: req.userId,
      type,
      ...(type === 'purchase' && {
        itemId,
        itemName,
        quantity: parsedQty,
        rate: parsedRate,
        baseAmount,
        extraItems: finalExtraItems,
        extraAmount: finalExtraAmount,
        shortageItems: finalShortageItems,
        shortageAmount: finalShortageAmount,
      }),
      amount: calculatedAmount,
      note: note ? note.trim() : '',
      entryDate: parsedEntryDate,
      entryTime: entryTime || '',
    });

    const updatedBalance = await getWholesalerBalance(wholesalerId);
    const updatedAdvanceBaqi = await getWholesalerAdvanceBaqi(wholesalerId);

    return res.status(201).json({
      entry,
      balance: updatedBalance,
      advanceBaqi: updatedAdvanceBaqi,
    });
  } catch (error) {
    console.error('Error creating wholesaler entry:', error);
    return res.status(500).json({ error: 'Server error while creating wholesaler entry' });
  }
};

/**
 * Returns all entries for a specific wholesaler grouped by month and day-wise
 * GET /api/wholesalers/:wholesalerId/entries
 */
const getEntriesByWholesaler = async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    const wholesaler = await Wholesaler.findOne({
      _id: wholesalerId,
      userId: req.userId,
    });

    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found or unauthorized' });
    }

    const allEntries = await WholesalerEntry.find({ wholesalerId: wholesaler._id }).sort({
      entryDate: 1,
      createdAt: 1,
    });

    const monthMap = new Map();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    allEntries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          year,
          monthIndex: monthNum,
          monthLabel: `${monthNames[monthNum]} ${year}`,
          entries: [],
          monthNet: 0,
          monthKharedari: 0,
          monthPayment: 0,
          monthAdvance: 0,
        });
      }

      const monthGroup = monthMap.get(monthKey);
      monthGroup.entries.push(entry);

      if (entry.type === 'purchase') {
        monthGroup.monthNet += entry.amount;
        monthGroup.monthKharedari += entry.amount;
      } else if (entry.type === 'payment') {
        monthGroup.monthNet -= entry.amount;
        monthGroup.monthPayment += entry.amount;
      } else if (entry.type === 'advanceSettlement') {
        // AdvanceSettlement counts toward reducing purchase debt just like a payment
        monthGroup.monthNet -= entry.amount;
        monthGroup.monthPayment += entry.amount;
      } else if (entry.type === 'advance') {
        // Advance given does NOT reduce purchase debt
        monthGroup.monthAdvance += entry.amount;
      }
    });

    const chronologicalMonths = Array.from(monthMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    let runningBalance = 0;
    const processedMonths = chronologicalMonths.map((m) => {
      const openingBalance = Math.round(runningBalance * 100) / 100;
      const monthNet = Math.round(m.monthNet * 100) / 100;
      const closingBalance = Math.round((openingBalance + monthNet) * 100) / 100;

      runningBalance = closingBalance;

      const displayEntries = [...m.entries].reverse();

      return {
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        openingBalance,
        monthNet,
        monthKharedari: Math.round(m.monthKharedari * 100) / 100,
        monthPayment: Math.round(m.monthPayment * 100) / 100,
        monthAdvance: Math.round(m.monthAdvance * 100) / 100,
        closingBalance,
        entries: displayEntries,
      };
    });

    const monthsNewestFirst = [...processedMonths].reverse();

    let wholesalerTotalKharedari = 0;
    let wholesalerTotalPayment = 0;
    let wholesalerTotalAdvance = 0;
    let wholesalerTotalAdvanceSettlement = 0;

    allEntries.forEach((entry) => {
      if (entry.type === 'purchase') {
        wholesalerTotalKharedari += entry.amount;
      } else if (entry.type === 'payment') {
        wholesalerTotalPayment += entry.amount;
      } else if (entry.type === 'advanceSettlement') {
        wholesalerTotalPayment += entry.amount;
        wholesalerTotalAdvanceSettlement += entry.amount;
      } else if (entry.type === 'advance') {
        wholesalerTotalAdvance += entry.amount;
      }
    });

    const finalKharedari = Math.round(wholesalerTotalKharedari * 100) / 100;
    const finalPayment = Math.round(wholesalerTotalPayment * 100) / 100;
    const finalAdvance = Math.round(wholesalerTotalAdvance * 100) / 100;
    const finalAdvanceSettlement = Math.round(wholesalerTotalAdvanceSettlement * 100) / 100;
    const finalAdvanceBaqi = Math.round((finalAdvance - finalAdvanceSettlement) * 100) / 100;
    const finalBaqiBaqaya = Math.round((finalKharedari - finalPayment) * 100) / 100;

    return res.status(200).json({
      wholesaler: {
        _id: wholesaler._id,
        name: wholesaler.name,
        phone: wholesaler.phone,
        totalKharedari: finalKharedari,
        totalPayment: finalPayment,
        totalAdvance: finalAdvance,
        totalAdvanceSettlement: finalAdvanceSettlement,
        advanceBaqi: finalAdvanceBaqi,
        baqiBaqaya: finalBaqiBaqaya,
        balance: finalBaqiBaqaya,
      },
      months: monthsNewestFirst,
    });
  } catch (error) {
    console.error('Error fetching wholesaler entries:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesaler entries' });
  }
};

/**
 * Updates a wholesaler entry
 * PUT /api/wholesaler-entries/:id
 */
const updateWholesalerEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemId,
      quantity,
      rate,
      extraItems: rawExtraItems,
      shortageItems: rawShortageItems,
      extraPieces,
      extraRate,
      shortagePieces,
      shortageRate,
      amount: rawAmount,
      note,
      entryDate,
      entryTime,
    } = req.body;

    const entry = await WholesalerEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const wholesaler = await Wholesaler.findOne({
      _id: entry.wholesalerId,
      userId: req.userId,
    });

    if (!wholesaler) {
      return res.status(404).json({ error: 'Unauthorized entry access' });
    }

    if (entry.type === 'purchase') {
      if (itemId) {
        const item = await WholesalerItem.findOne({ _id: itemId, userId: req.userId });
        if (!item) {
          return res.status(404).json({ error: 'Item not found in wholesaler catalog' });
        }
        entry.itemId = item._id;
        entry.itemName = item.name;
      }

      const effectiveQty = quantity !== undefined ? Math.max(0, Number(quantity) || 0) : entry.quantity;
      const effectiveRate = rate !== undefined ? Math.max(0, Number(rate) || 0) : entry.rate;
      const baseAmount = Math.round(effectiveQty * effectiveRate * 100) / 100;

      // Handle extraItems array or legacy fields
      let incomingExtra = rawExtraItems !== undefined
        ? rawExtraItems
        : (extraPieces !== undefined && Number(extraPieces) > 0)
          ? [{
              itemId: entry.itemId,
              pieces: Number(extraPieces),
              rate: extraRate !== undefined ? Number(extraRate) : effectiveRate,
            }]
          : entry.extraItems;

      // Handle shortageItems array or legacy fields
      let incomingShortage = rawShortageItems !== undefined
        ? rawShortageItems
        : (shortagePieces !== undefined && Number(shortagePieces) > 0)
          ? [{
              itemId: entry.itemId,
              pieces: Number(shortagePieces),
              rate: shortageRate !== undefined ? Number(shortageRate) : effectiveRate,
            }]
          : entry.shortageItems;

      const extraResult = await processAdjustmentItems(incomingExtra, effectiveRate, req.userId);
      const shortageResult = await processAdjustmentItems(incomingShortage, effectiveRate, req.userId);

      entry.quantity = effectiveQty;
      entry.rate = effectiveRate;
      entry.baseAmount = baseAmount;
      entry.extraItems = extraResult.sanitizedItems;
      entry.extraAmount = extraResult.totalAmount;
      entry.shortageItems = shortageResult.sanitizedItems;
      entry.shortageAmount = shortageResult.totalAmount;

      let finalAmount = Math.round((baseAmount + extraResult.totalAmount - shortageResult.totalAmount) * 100) / 100;
      if (finalAmount < 0) finalAmount = 0;
      entry.amount = finalAmount;
    } else if (entry.type === 'advanceSettlement') {
      if (rawAmount !== undefined) {
        const parsedAmount = Number(rawAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return res.status(400).json({ error: 'Adjustment amount must be greater than 0' });
        }
        const delta = parsedAmount - entry.amount;
        if (delta > 0) {
          const currentAdvanceBaqi = await getWholesalerAdvanceBaqi(entry.wholesalerId);
          if (delta > currentAdvanceBaqi) {
            return res.status(400).json({
              error: `Itna advance available nahi hai. Moujooda Advance Baqi: Rs. ${currentAdvanceBaqi.toLocaleString()}`,
            });
          }
        }
        entry.amount = Math.round(parsedAmount * 100) / 100;
      }
    } else {
      // Payment or Advance type
      if (rawAmount !== undefined) {
        const parsedAmount = Number(rawAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return res.status(400).json({ error: `${entry.type === 'advance' ? 'Advance' : 'Payment'} amount must be greater than 0` });
        }
        entry.amount = Math.round(parsedAmount * 100) / 100;
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

    const updatedBalance = await getWholesalerBalance(entry.wholesalerId);
    const updatedAdvanceBaqi = await getWholesalerAdvanceBaqi(entry.wholesalerId);

    return res.status(200).json({
      entry,
      balance: updatedBalance,
      advanceBaqi: updatedAdvanceBaqi,
    });
  } catch (error) {
    console.error('Error updating wholesaler entry:', error);
    return res.status(500).json({ error: 'Server error while updating wholesaler entry' });
  }
};

/**
 * Deletes a wholesaler entry
 * DELETE /api/wholesaler-entries/:id
 */
const deleteWholesalerEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await WholesalerEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const wholesaler = await Wholesaler.findOne({
      _id: entry.wholesalerId,
      userId: req.userId,
    });

    if (!wholesaler) {
      return res.status(404).json({ error: 'Unauthorized entry access' });
    }

    const wholesalerId = entry.wholesalerId;
    await WholesalerEntry.findByIdAndDelete(id);

    const updatedBalance = await getWholesalerBalance(wholesalerId);
    const updatedAdvanceBaqi = await getWholesalerAdvanceBaqi(wholesalerId);

    return res.status(200).json({
      message: 'Entry deleted successfully',
      balance: updatedBalance,
      advanceBaqi: updatedAdvanceBaqi,
    });
  } catch (error) {
    console.error('Error deleting wholesaler entry:', error);
    return res.status(500).json({ error: 'Server error while deleting wholesaler entry' });
  }
};

module.exports = {
  createWholesalerEntry,
  getEntriesByWholesaler,
  updateWholesalerEntry,
  deleteWholesalerEntry,
};
