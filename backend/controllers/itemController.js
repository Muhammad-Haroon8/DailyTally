// controllers/itemController.js
// Item Master CRUD controller functions scoped to req.userId

const Item = require('../models/Item');

/**
 * Creates a new item in the master catalog
 * Enforces unique name per user (case-insensitive)
 * POST /api/items
 */
const createItem = async (req, res) => {
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

    // Check duplicate item name for this user (case-insensitive)
    const existingItem = await Item.findOne({
      userId: req.userId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existingItem) {
      return res.status(409).json({ error: `An item named "${trimmedName}" already exists` });
    }

    const item = await Item.create({
      userId: req.userId,
      name: trimmedName,
      defaultRate: numericRate,
    });

    return res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    return res.status(500).json({ error: 'Server error while creating item' });
  }
};

/**
 * Returns all items belonging to req.userId, sorted alphabetically
 * GET /api/items
 */
const getItems = async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId }).sort({ name: 1 });
    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return res.status(500).json({ error: 'Server error while fetching items' });
  }
};

/**
 * Returns a single item by id (scoped to req.userId)
 * GET /api/items/:id
 */
const getItemById = async (req, res) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching item by id:', error);
    return res.status(500).json({ error: 'Server error while fetching item' });
  }
};

/**
 * Updates an item's name and/or defaultRate
 * Ensures updated name doesn't conflict with another existing item for this user
 * PUT /api/items/:id
 */
const updateItem = async (req, res) => {
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

    // Check for duplicate name conflicts with any other item of this user
    const duplicate = await Item.findOne({
      userId: req.userId,
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (duplicate) {
      return res.status(409).json({ error: `Another item named "${trimmedName}" already exists` });
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        name: trimmedName,
        defaultRate: numericRate,
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    return res.status(500).json({ error: 'Server error while updating item' });
  }
};

/**
 * Deletes an item (scoped to req.userId)
 * DELETE /api/items/:id
 */
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return res.status(500).json({ error: 'Server error while deleting item' });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
};
