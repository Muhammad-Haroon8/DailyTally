// controllers/wholesalerItemController.js
// Wholesaler Item Master CRUD controller functions scoped to req.userId (independent of Customer items)
// Soft-delete enabled with permanent AuditLog tracking

const WholesalerItem = require('../models/WholesalerItem');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Creates a new wholesaler purchase item in the catalog
 * Enforces unique name per user/shop (case-insensitive) among active items
 * POST /api/wholesaler-items
 */
const createWholesalerItem = async (req, res) => {
  try {
    const { name, defaultRate } = req.body;

    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    // Validate defaultRate
    const numericRate = Number(defaultRate);
    if (isNaN(numericRate) || numericRate < 0) {
      return res.status(400).json({ error: 'Default rate must be a valid non-negative number' });
    }

    const trimmedName = name.trim();

    // Check duplicate item name for this user/shop (case-insensitive) among active items
    const existingItem = await WholesalerItem.findOne({
      userId: req.userId,
      isDeleted: { $ne: true },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existingItem) {
      return res.status(409).json({ error: `An item named "${trimmedName}" already exists in wholesaler catalog` });
    }

    const item = await WholesalerItem.create({
      userId: req.userId,
      name: trimmedName,
      defaultRate: numericRate,
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error('Error creating wholesaler item:', error);
    return res.status(500).json({ error: 'Server error while creating wholesaler item' });
  }
};

/**
 * Returns all active wholesaler purchase items belonging to req.userId, sorted alphabetically
 * GET /api/wholesaler-items
 */
const getWholesalerItems = async (req, res) => {
  try {
    const items = await WholesalerItem.find({
      userId: req.userId,
      isDeleted: { $ne: true },
    }).sort({ name: 1 });
    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching wholesaler items:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesaler items' });
  }
};

/**
 * Returns a single active wholesaler item by id (scoped to req.userId)
 * GET /api/wholesaler-items/:id
 */
const getWholesalerItemById = async (req, res) => {
  try {
    const item = await WholesalerItem.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: { $ne: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Wholesaler item not found' });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching wholesaler item by id:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesaler item' });
  }
};

/**
 * Updates a wholesaler item's name and/or defaultRate
 * Ensures updated name doesn't conflict with another existing active item in wholesaler catalog
 * PUT /api/wholesaler-items/:id
 */
const updateWholesalerItem = async (req, res) => {
  try {
    const { name, defaultRate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name cannot be empty' });
    }

    const numericRate = Number(defaultRate);
    if (isNaN(numericRate) || numericRate < 0) {
      return res.status(400).json({ error: 'Default rate must be a valid non-negative number' });
    }

    const trimmedName = name.trim();

    // Check for duplicate name conflicts among active items
    const duplicate = await WholesalerItem.findOne({
      userId: req.userId,
      _id: { $ne: req.params.id },
      isDeleted: { $ne: true },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (duplicate) {
      return res.status(409).json({ error: `Another item named "${trimmedName}" already exists in wholesaler catalog` });
    }

    const item = await WholesalerItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, isDeleted: { $ne: true } },
      {
        name: trimmedName,
        defaultRate: numericRate,
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Wholesaler item not found' });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error('Error updating wholesaler item:', error);
    return res.status(500).json({ error: 'Server error while updating wholesaler item' });
  }
};

/**
 * Soft-deletes a wholesaler item (scoped to req.userId)
 * Captures snapshot into AuditLog
 * DELETE /api/wholesaler-items/:id
 */
const deleteWholesalerItem = async (req, res) => {
  try {
    const item = await WholesalerItem.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDeleted: { $ne: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Wholesaler item not found' });
    }

    const snapshot = item.toObject();

    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = req.userId;
    await item.save();

    // Fetch user for name snapshot
    const user = await User.findById(req.userId).select('name');

    // Create AuditLog record
    await AuditLog.create({
      shopId: req.userId,
      performedByUserId: req.userId,
      performedByUserName: user?.name || 'Unknown User',
      action: 'delete',
      entityType: 'WholesalerItem',
      entityId: item._id,
      entitySnapshot: snapshot,
      timestamp: new Date(),
    });

    return res.status(200).json({ message: 'Wholesaler item deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting wholesaler item:', error);
    return res.status(500).json({ error: 'Server error while deleting wholesaler item' });
  }
};

module.exports = {
  createWholesalerItem,
  getWholesalerItems,
  getWholesalerItemById,
  updateWholesalerItem,
  deleteWholesalerItem,
};
