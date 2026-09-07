// controllers/wholesalerController.js
// Wholesaler CRUD controllers scoped strictly to req.userId with balance aggregation

const mongoose = require('mongoose');
const Wholesaler = require('../models/Wholesaler');
const WholesalerEntry = require('../models/WholesalerEntry');

/**
 * Creates a new wholesaler for the logged-in user
 * POST /api/wholesalers
 */
const createWholesaler = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Wholesaler name is required' });
    }

    const wholesaler = await Wholesaler.create({
      userId: req.userId,
      name: name.trim(),
      phone: phone ? phone.trim() : '',
    });

    return res.status(201).json({
      ...wholesaler.toObject(),
      totalKharedari: 0,
      totalPayment: 0,
      totalAdvance: 0,
      totalAdvanceSettlement: 0,
      advanceBaqi: 0,
      baqiBaqaya: 0,
      balance: 0,
    });
  } catch (error) {
    console.error('Error creating wholesaler:', error);
    return res.status(500).json({ error: 'Server error while creating wholesaler' });
  }
};

/**
 * Returns all wholesalers belonging to req.userId with calculated balance, sorted alphabetically
 * Supports ?search= query param
 * GET /api/wholesalers
 */
const getWholesalers = async (req, res) => {
  try {
    const { search } = req.query;
    const matchQuery = { userId: new mongoose.Types.ObjectId(req.userId) };

    if (search && search.trim()) {
      matchQuery.name = { $regex: search.trim(), $options: 'i' };
    }

    const wholesalers = await Wholesaler.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'wholesalerentries',
          localField: '_id',
          foreignField: 'wholesalerId',
          as: 'entries',
        },
      },
      {
        $addFields: {
          totalKharedari: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'purchase'] }, '$$e.amount', 0],
                },
              },
            },
          },
          totalPayment: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [
                    { $or: [{ $eq: ['$$e.type', 'payment'] }, { $eq: ['$$e.type', 'advanceSettlement'] }] },
                    '$$e.amount',
                    0,
                  ],
                },
              },
            },
          },
          totalDirectPayment: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'payment'] }, '$$e.amount', 0],
                },
              },
            },
          },
          totalAdvance: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'advance'] }, '$$e.amount', 0],
                },
              },
            },
          },
          totalAdvanceSettlement: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'advanceSettlement'] }, '$$e.amount', 0],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          baqiBaqaya: {
            $round: [{ $subtract: ['$totalKharedari', '$totalPayment'] }, 2],
          },
          balance: {
            $round: [{ $subtract: ['$totalKharedari', '$totalPayment'] }, 2],
          },
          advanceBaqi: {
            $round: [{ $subtract: ['$totalAdvance', '$totalAdvanceSettlement'] }, 2],
          },
        },
      },
      {
        $project: {
          entries: 0,
        },
      },
      { $sort: { name: 1 } },
    ]);

    return res.status(200).json(wholesalers);
  } catch (error) {
    console.error('Error fetching wholesalers:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesalers' });
  }
};

/**
 * Returns a single wholesaler with lifetime totals
 * GET /api/wholesalers/:id
 */
const getWholesalerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid wholesaler ID' });
    }

    const wholesalers = await Wholesaler.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(req.userId),
        },
      },
      {
        $lookup: {
          from: 'wholesalerentries',
          localField: '_id',
          foreignField: 'wholesalerId',
          as: 'entries',
        },
      },
      {
        $addFields: {
          totalKharedari: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'purchase'] }, '$$e.amount', 0],
                },
              },
            },
          },
          totalPayment: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [
                    { $or: [{ $eq: ['$$e.type', 'payment'] }, { $eq: ['$$e.type', 'advanceSettlement'] }] },
                    '$$e.amount',
                    0,
                  ],
                },
              },
            },
          },
          totalDirectPayment: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'payment'] }, '$$e.amount', 0],
                },
              },
            },
          },
          totalAdvance: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'advance'] }, '$$e.amount', 0],
                },
              },
            },
          },
          totalAdvanceSettlement: {
            $sum: {
              $map: {
                input: '$entries',
                as: 'e',
                in: {
                  $cond: [{ $eq: ['$$e.type', 'advanceSettlement'] }, '$$e.amount', 0],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          baqiBaqaya: {
            $round: [{ $subtract: ['$totalKharedari', '$totalPayment'] }, 2],
          },
          balance: {
            $round: [{ $subtract: ['$totalKharedari', '$totalPayment'] }, 2],
          },
          advanceBaqi: {
            $round: [{ $subtract: ['$totalAdvance', '$totalAdvanceSettlement'] }, 2],
          },
        },
      },
      {
        $project: {
          entries: 0,
        },
      },
    ]);

    if (!wholesalers || wholesalers.length === 0) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    return res.status(200).json(wholesalers[0]);
  } catch (error) {
    console.error('Error fetching wholesaler by id:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesaler' });
  }
};

/**
 * Updates a wholesaler's name and phone
 * PUT /api/wholesalers/:id
 */
const updateWholesaler = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Wholesaler name is required' });
    }

    const wholesaler = await Wholesaler.findOneAndUpdate(
      { _id: id, userId: req.userId },
      {
        name: name.trim(),
        phone: phone !== undefined ? phone.trim() : '',
      },
      { new: true, runValidators: true }
    );

    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found or unauthorized' });
    }

    return res.status(200).json(wholesaler);
  } catch (error) {
    console.error('Error updating wholesaler:', error);
    return res.status(500).json({ error: 'Server error while updating wholesaler' });
  }
};

/**
 * Deletes a wholesaler and all associated purchase/payment entries
 * DELETE /api/wholesalers/:id
 */
const deleteWholesaler = async (req, res) => {
  try {
    const { id } = req.params;

    const wholesaler = await Wholesaler.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found or unauthorized' });
    }

    // Cascade delete entries
    await WholesalerEntry.deleteMany({ wholesalerId: id });

    return res.status(200).json({
      message: 'Wholesaler and all related entries deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting wholesaler:', error);
    return res.status(500).json({ error: 'Server error while deleting wholesaler' });
  }
};

/**
 * Returns aggregated shop-wide analytics for wholesalers
 * GET /api/wholesalers/analytics/summary
 */
const getWholesalerAnalyticsSummary = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const result = await Wholesaler.aggregate([
      { $match: { userId: userObjectId } },
      {
        $lookup: {
          from: 'wholesalerentries',
          localField: '_id',
          foreignField: 'wholesalerId',
          as: 'entries',
        },
      },
      { $unwind: '$entries' },
      {
        $group: {
          _id: null,
          totalKharedari: {
            $sum: {
              $cond: [{ $eq: ['$entries.type', 'purchase'] }, '$entries.amount', 0],
            },
          },
          totalPayment: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$entries.type', 'payment'] }, { $eq: ['$entries.type', 'advanceSettlement'] }] },
                '$entries.amount',
                0,
              ],
            },
          },
          totalDirectPayment: {
            $sum: {
              $cond: [{ $eq: ['$entries.type', 'payment'] }, '$entries.amount', 0],
            },
          },
          totalAdvance: {
            $sum: {
              $cond: [{ $eq: ['$entries.type', 'advance'] }, '$entries.amount', 0],
            },
          },
          totalAdvanceSettlement: {
            $sum: {
              $cond: [{ $eq: ['$entries.type', 'advanceSettlement'] }, '$entries.amount', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalKharedari: { $round: ['$totalKharedari', 2] },
          totalPayment: { $round: ['$totalPayment', 2] },
          totalAdvance: { $round: ['$totalAdvance', 2] },
          totalAdvanceSettlement: { $round: ['$totalAdvanceSettlement', 2] },
          advanceBaqi: { $round: [{ $subtract: ['$totalAdvance', '$totalAdvanceSettlement'] }, 2] },
          baqiBaqaya: { $round: [{ $subtract: ['$totalKharedari', '$totalPayment'] }, 2] },
        },
      },
    ]);

    if (result && result.length > 0) {
      return res.status(200).json(result[0]);
    }

    return res.status(200).json({
      totalKharedari: 0,
      totalPayment: 0,
      totalAdvance: 0,
      totalAdvanceSettlement: 0,
      advanceBaqi: 0,
      baqiBaqaya: 0,
    });
  } catch (error) {
    console.error('Error fetching wholesaler analytics summary:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesaler analytics summary' });
  }
};

module.exports = {
  createWholesaler,
  getWholesalers,
  getWholesalerById,
  updateWholesaler,
  deleteWholesaler,
  getWholesalerAnalyticsSummary,
};
