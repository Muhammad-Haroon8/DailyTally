// controllers/wholesalerItemController.js
// Wholesaler Item Master CRUD controller functions scoped to req.userId (independent of Customer items)

const WholesalerItem = require('../models/WholesalerItem');

/**
 * Creates a new wholesaler purchase item in the catalog
 * Enforces unique name per user/shop (case-insensitive)
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

    // Check duplicate item name for this user/shop (case-insensitive)
    const existingItem = await WholesalerItem.findOne({
      userId: req.userId,
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
 * Returns all wholesaler purchase items belonging to req.userId, sorted alphabetically
 * GET /api/wholesaler-items
 */
const getWholesalerItems = async (req, res) => {
  try {
    const items = await WholesalerItem.find({ userId: req.userId }).sort({ name: 1 });
    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching wholesaler items:', error);
    return res.status(500).json({ error: 'Server error while fetching wholesaler items' });
  }
};

/**
 * Returns a single wholesaler item by id (scoped to req.userId)
 * GET /api/wholesaler-items/:id
 */
const getWholesalerItemById = async (req, res) => {
  try {
    const item = await WholesalerItem.findOne({
      _id: req.params.id,
      userId: req.userId,
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
 * Ensures updated name doesn't conflict with another existing item in wholesaler catalog
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

    // Check for duplicate name conflicts
    const duplicate = await WholesalerItem.findOne({
      userId: req.userId,
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (duplicate) {
      return res.status(409).json({ error: `Another item named "${trimmedName}" already exists in wholesaler catalog` });
    }

    const item = await WholesalerItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
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
 * Deletes a wholesaler item (scoped to req.userId)
 * DELETE /api/wholesaler-items/:id
 */
const deleteWholesalerItem = async (req, res) => {
  try {
    const item = await WholesalerItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item) {
      return res.status(404).json({ error: 'Wholesaler item not found' });
    }

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
