// controllers/superAdminController.js
// Read-only Super Admin endpoints for platform-wide oversight and audit recovery

const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Wholesaler = require('../models/Wholesaler');
const Entry = require('../models/Entry');
const WholesalerEntry = require('../models/WholesalerEntry');
const Item = require('../models/Item');
const AuditLog = require('../models/AuditLog');

/**
 * Lists all shops in the system with owner details and counts
 * GET /api/super-admin/shops
 */
const getShops = async (req, res) => {
  try {
    const shops = await User.find({}).select('-passwordHash').sort({ createdAt: -1 }).lean();

    // Enrich each shop with counts
    const enrichedShops = await Promise.all(
      shops.map(async (shop) => {
        const [
          totalCustomers,
          activeCustomers,
          deletedCustomers,
          totalWholesalers,
          activeWholesalers,
          deletedWholesalers,
          itemCount,
        ] = await Promise.all([
          Customer.countDocuments({ userId: shop._id }),
          Customer.countDocuments({ userId: shop._id, isDeleted: { $ne: true } }),
          Customer.countDocuments({ userId: shop._id, isDeleted: true }),
          Wholesaler.countDocuments({ userId: shop._id }),
          Wholesaler.countDocuments({ userId: shop._id, isDeleted: { $ne: true } }),
          Wholesaler.countDocuments({ userId: shop._id, isDeleted: true }),
          Item.countDocuments({ userId: shop._id, isDeleted: { $ne: true } }),
        ]);

        return {
          id: shop._id,
          name: shop.name,
          email: shop.email,
          phone: shop.phone || '',
          createdAt: shop.createdAt,
          counts: {
            customers: {
              total: totalCustomers,
              active: activeCustomers,
              deleted: deletedCustomers,
            },
            wholesalers: {
              total: totalWholesalers,
              active: activeWholesalers,
              deleted: deletedWholesalers,
            },
            items: itemCount,
            staff: 1, // Current architecture: 1 primary owner/user per shop
          },
        };
      })
    );

    return res.status(200).json(enrichedShops);
  } catch (error) {
    console.error('Super Admin getShops error:', error);
    return res.status(500).json({ error: 'Server error while fetching shops' });
  }
};

/**
 * Lists every customer belonging to a shop (including soft-deleted ones) with lifetime totals
 * GET /api/super-admin/shops/:shopId/customers
 */
const getShopCustomers = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ error: 'Invalid shop ID' });
    }

    const shop = await User.findById(shopId).select('name email phone');
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    // Fetch all customers for this shop (including soft-deleted)
    const customers = await Customer.aggregate([
      { $match: { userId: shopObjectId } },
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
          as: 'activeEntries',
        },
      },
      {
        $addFields: {
          totalUdhaar: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: '$activeEntries',
                    as: 'e',
                    in: { $cond: [{ $eq: ['$$e.type', 'item'] }, '$$e.amount', 0] },
                  },
                },
              },
              2,
            ],
          },
          totalWasool: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: '$activeEntries',
                    as: 'e',
                    in: { $cond: [{ $eq: ['$$e.type', 'payment'] }, '$$e.amount', 0] },
                  },
                },
              },
              2,
            ],
          },
        },
      },
      {
        $addFields: {
          balance: {
            $round: [{ $subtract: ['$totalUdhaar', '$totalWasool'] }, 2],
          },
        },
      },
      {
        $project: {
          activeEntries: 0,
        },
      },
      { $sort: { isDeleted: 1, name: 1 } },
    ]);

    return res.status(200).json({
      shop: {
        id: shop._id,
        name: shop.name,
        email: shop.email,
        phone: shop.phone,
      },
      customers,
    });
  } catch (error) {
    console.error('Super Admin getShopCustomers error:', error);
    return res.status(500).json({ error: 'Server error while fetching shop customers' });
  }
};

/**
 * Returns a specific customer's full details and entry history across all shops
 * (including soft-deleted entries, clearly flagged)
 * GET /api/super-admin/customers/:customerId
 */
const getCustomerDetailsAndHistory = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    const customer = await Customer.findById(customerId).populate('userId', 'name email phone').populate('deletedBy', 'name email');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Fetch all entries (including soft-deleted)
    const entries = await Entry.find({ customerId: customer._id })
      .populate('deletedBy', 'name email')
      .sort({ entryDate: -1, createdAt: -1 })
      .lean();

    // Compute active totals
    let totalUdhaar = 0;
    let totalWasool = 0;
    let deletedEntriesCount = 0;

    entries.forEach((e) => {
      if (e.isDeleted) {
        deletedEntriesCount++;
      } else {
        if (e.type === 'item') {
          totalUdhaar += e.amount;
        } else if (e.type === 'payment') {
          totalWasool += e.amount;
        }
      }
    });

    totalUdhaar = Math.round(totalUdhaar * 100) / 100;
    totalWasool = Math.round(totalWasool * 100) / 100;
    const balance = Math.round((totalUdhaar - totalWasool) * 100) / 100;

    return res.status(200).json({
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        isDeleted: !!customer.isDeleted,
        deletedAt: customer.deletedAt,
        deletedBy: customer.deletedBy
          ? { id: customer.deletedBy._id, name: customer.deletedBy.name, email: customer.deletedBy.email }
          : null,
        createdAt: customer.createdAt,
      },
      shop: {
        id: customer.userId?._id,
        name: customer.userId?.name,
        email: customer.userId?.email,
        phone: customer.userId?.phone,
      },
      totals: {
        totalUdhaar,
        totalWasool,
        balance,
        activeEntriesCount: entries.length - deletedEntriesCount,
        deletedEntriesCount,
        totalEntriesCount: entries.length,
      },
      entries,
    });
  } catch (error) {
    console.error('Super Admin getCustomerDetailsAndHistory error:', error);
    return res.status(500).json({ error: 'Server error while fetching customer details' });
  }
};

/**
 * Lists every wholesaler belonging to a shop (including soft-deleted ones) with lifetime totals
 * GET /api/super-admin/shops/:shopId/wholesalers
 */
const getShopWholesalers = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ error: 'Invalid shop ID' });
    }

    const shop = await User.findById(shopId).select('name email phone');
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const wholesalers = await Wholesaler.aggregate([
      { $match: { userId: shopObjectId } },
      {
        $lookup: {
          from: 'wholesalerentries',
          let: { wId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$wholesalerId', '$$wId'] },
                isDeleted: { $ne: true },
              },
            },
          ],
          as: 'activeEntries',
        },
      },
      {
        $addFields: {
          totalKharedari: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: '$activeEntries',
                    as: 'e',
                    in: { $cond: [{ $eq: ['$$e.type', 'purchase'] }, '$$e.amount', 0] },
                  },
                },
              },
              2,
            ],
          },
          totalPayment: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: '$activeEntries',
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
              2,
            ],
          },
          totalAdvance: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: '$activeEntries',
                    as: 'e',
                    in: { $cond: [{ $eq: ['$$e.type', 'advance'] }, '$$e.amount', 0] },
                  },
                },
              },
              2,
            ],
          },
          totalAdvanceSettlement: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: '$activeEntries',
                    as: 'e',
                    in: { $cond: [{ $eq: ['$$e.type', 'advanceSettlement'] }, '$$e.amount', 0] },
                  },
                },
              },
              2,
            ],
          },
        },
      },
      {
        $addFields: {
          baqiBaqaya: {
            $round: [{ $subtract: ['$totalKharedari', '$totalPayment'] }, 2],
          },
          advanceBaqi: {
            $round: [{ $subtract: ['$totalAdvance', '$totalAdvanceSettlement'] }, 2],
          },
        },
      },
      {
        $project: {
          activeEntries: 0,
        },
      },
      { $sort: { isDeleted: 1, name: 1 } },
    ]);

    return res.status(200).json({
      shop: {
        id: shop._id,
        name: shop.name,
        email: shop.email,
        phone: shop.phone,
      },
      wholesalers,
    });
  } catch (error) {
    console.error('Super Admin getShopWholesalers error:', error);
    return res.status(500).json({ error: 'Server error while fetching shop wholesalers' });
  }
};

/**
 * Returns a specific wholesaler's full details and entry history across all shops
 * (including soft-deleted entries, clearly flagged)
 * GET /api/super-admin/wholesalers/:wholesalerId
 */
const getWholesalerDetailsAndHistory = async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json({ error: 'Invalid wholesaler ID' });
    }

    const wholesaler = await Wholesaler.findById(wholesalerId)
      .populate('userId', 'name email phone')
      .populate('deletedBy', 'name email');

    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    // Fetch all entries (including soft-deleted)
    const entries = await WholesalerEntry.find({ wholesalerId: wholesaler._id })
      .populate('deletedBy', 'name email')
      .sort({ entryDate: -1, createdAt: -1 })
      .lean();

    let totalKharedari = 0;
    let totalPayment = 0;
    let totalAdvance = 0;
    let totalAdvanceSettlement = 0;
    let deletedEntriesCount = 0;

    entries.forEach((e) => {
      if (e.isDeleted) {
        deletedEntriesCount++;
      } else {
        if (e.type === 'purchase') {
          totalKharedari += e.amount;
        } else if (e.type === 'payment') {
          totalPayment += e.amount;
        } else if (e.type === 'advance') {
          totalAdvance += e.amount;
        } else if (e.type === 'advanceSettlement') {
          totalPayment += e.amount;
          totalAdvanceSettlement += e.amount;
        }
      }
    });

    totalKharedari = Math.round(totalKharedari * 100) / 100;
    totalPayment = Math.round(totalPayment * 100) / 100;
    totalAdvance = Math.round(totalAdvance * 100) / 100;
    totalAdvanceSettlement = Math.round(totalAdvanceSettlement * 100) / 100;
    const baqiBaqaya = Math.round((totalKharedari - totalPayment) * 100) / 100;
    const advanceBaqi = Math.round((totalAdvance - totalAdvanceSettlement) * 100) / 100;

    return res.status(200).json({
      wholesaler: {
        id: wholesaler._id,
        name: wholesaler.name,
        phone: wholesaler.phone,
        isDeleted: !!wholesaler.isDeleted,
        deletedAt: wholesaler.deletedAt,
        deletedBy: wholesaler.deletedBy
          ? { id: wholesaler.deletedBy._id, name: wholesaler.deletedBy.name, email: wholesaler.deletedBy.email }
          : null,
        createdAt: wholesaler.createdAt,
      },
      shop: {
        id: wholesaler.userId?._id,
        name: wholesaler.userId?.name,
        email: wholesaler.userId?.email,
        phone: wholesaler.userId?.phone,
      },
      totals: {
        totalKharedari,
        totalPayment,
        totalAdvance,
        totalAdvanceSettlement,
        baqiBaqaya,
        advanceBaqi,
        activeEntriesCount: entries.length - deletedEntriesCount,
        deletedEntriesCount,
        totalEntriesCount: entries.length,
      },
      entries,
    });
  } catch (error) {
    console.error('Super Admin getWholesalerDetailsAndHistory error:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesaler details' });
  }
};

/**
 * Returns AuditLog entries, sorted most recent first, with optional filters
 * GET /api/super-admin/audit-log
 * Query params: ?shopId=...&userId=...&entityType=...&startDate=...&endDate=...&limit=...&page=...
 */
const getAuditLogs = async (req, res) => {
  try {
    const { shopId, userId, entityType, startDate, endDate, limit = 100, page = 1 } = req.query;

    const filter = {};

    if (shopId && mongoose.Types.ObjectId.isValid(shopId)) {
      filter.shopId = new mongoose.Types.ObjectId(shopId);
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.performedByUserId = new mongoose.Types.ObjectId(userId);
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (!isNaN(start.getTime())) filter.timestamp.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(end.getTime())) filter.timestamp.$lte = end;
      }
    }

    const parsedLimit = Math.min(500, Math.max(1, Number(limit) || 100));
    const parsedPage = Math.max(1, Number(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('shopId', 'name email')
        .populate('performedByUserId', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
      logs,
    });
  } catch (error) {
    console.error('Super Admin getAuditLogs error:', error);
    return res.status(500).json({ error: 'Server error while fetching audit logs' });
  }
};

/**
 * Returns the full audit history for one specific entity
 * GET /api/super-admin/audit-log/:entityId
 */
const getEntityAuditHistory = async (req, res) => {
  try {
    const { entityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    const logs = await AuditLog.find({ entityId: new mongoose.Types.ObjectId(entityId) })
      .populate('shopId', 'name email')
      .populate('performedByUserId', 'name email')
      .sort({ timestamp: -1 })
      .lean();

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Super Admin getEntityAuditHistory error:', error);
    return res.status(500).json({ error: 'Server error while fetching entity audit history' });
  }
};

module.exports = {
  getShops,
  getShopCustomers,
  getCustomerDetailsAndHistory,
  getShopWholesalers,
  getWholesalerDetailsAndHistory,
  getAuditLogs,
  getEntityAuditHistory,
};
