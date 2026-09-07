// backend/scripts/migrateAdjustmentArrays.js
// One-time migration script to convert existing extra/shortage single fields into line-item arrays

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function migrateAdjustmentArrays() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for adjustment arrays migration...');

    const collection = mongoose.connection.collection('wholesalerentries');

    const entries = await collection.find({
      type: 'purchase',
      $or: [
        { extraPieces: { $gt: 0 } },
        { shortagePieces: { $gt: 0 } },
        { extraItems: { $exists: false } },
        { shortageItems: { $exists: false } },
      ],
    }).toArray();

    console.log(`Found ${entries.length} purchase entries to check/migrate.`);

    let migratedCount = 0;

    for (const entry of entries) {
      const extraItems = Array.isArray(entry.extraItems) ? [...entry.extraItems] : [];
      const shortageItems = Array.isArray(entry.shortageItems) ? [...entry.shortageItems] : [];

      // If old single extraPieces existed and extraItems is empty, convert it
      if (entry.extraPieces > 0 && extraItems.length === 0) {
        extraItems.push({
          itemId: entry.itemId || null,
          itemName: entry.itemName || 'Extra Item',
          pieces: Number(entry.extraPieces) || 0,
          rate: Number(entry.extraRate) || Number(entry.rate) || 0,
          amount: Number(entry.extraAmount) || ((Number(entry.extraPieces) || 0) / 2) * (Number(entry.extraRate) || Number(entry.rate) || 0),
        });
      }

      // If old single shortagePieces existed and shortageItems is empty, convert it
      if (entry.shortagePieces > 0 && shortageItems.length === 0) {
        shortageItems.push({
          itemId: entry.itemId || null,
          itemName: entry.itemName || 'Shortage Item',
          pieces: Number(entry.shortagePieces) || 0,
          rate: Number(entry.shortageRate) || Number(entry.rate) || 0,
          amount: Number(entry.shortageAmount) || ((Number(entry.shortagePieces) || 0) / 2) * (Number(entry.shortageRate) || Number(entry.rate) || 0),
        });
      }

      const totalExtraAmount = extraItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const totalShortageAmount = shortageItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      await collection.updateOne(
        { _id: entry._id },
        {
          $set: {
            extraItems,
            shortageItems,
            extraAmount: totalExtraAmount,
            shortageAmount: totalShortageAmount,
          },
          $unset: {
            extraPieces: '',
            extraRate: '',
            shortagePieces: '',
            shortageRate: '',
          },
        }
      );

      migratedCount++;
    }

    console.log(`✅ Successfully migrated ${migratedCount} wholesaler entries to adjustment arrays.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateAdjustmentArrays();
