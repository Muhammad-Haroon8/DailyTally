// backend/scripts/migrateAdjustmentFields.js
// One-time migration script to migrate single adjustmentType fields to independent extra & shortage fields

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function migrateAdjustmentFields() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for adjustment fields migration...');

    // Use dynamic collection access so schema changes don't block reading old fields
    const collection = mongoose.connection.collection('wholesalerentries');

    const entries = await collection.find({
      type: 'purchase',
      $or: [
        { adjustmentType: { $exists: true, $ne: 'none' } },
        { adjustmentPieces: { $gt: 0 } },
      ],
    }).toArray();

    console.log(`Found ${entries.length} purchase entries to check/migrate.`);

    let migratedCount = 0;

    for (const entry of entries) {
      const updateDoc = {};

      const pieces = Number(entry.adjustmentPieces) || 0;
      const rate = Number(entry.adjustmentRate) || Number(entry.rate) || 0;
      const calcAmount = Number(entry.adjustmentAmount) || (pieces / 2) * rate;

      if (entry.adjustmentType === 'extra') {
        updateDoc.extraPieces = pieces;
        updateDoc.extraRate = rate;
        updateDoc.extraAmount = calcAmount;
        updateDoc.shortagePieces = 0;
        updateDoc.shortageRate = 0;
        updateDoc.shortageAmount = 0;
      } else if (entry.adjustmentType === 'shortage') {
        updateDoc.shortagePieces = pieces;
        updateDoc.shortageRate = rate;
        updateDoc.shortageAmount = calcAmount;
        updateDoc.extraPieces = 0;
        updateDoc.extraRate = 0;
        updateDoc.extraAmount = 0;
      } else {
        updateDoc.extraPieces = 0;
        updateDoc.extraRate = 0;
        updateDoc.extraAmount = 0;
        updateDoc.shortagePieces = 0;
        updateDoc.shortageRate = 0;
        updateDoc.shortageAmount = 0;
      }

      await collection.updateOne(
        { _id: entry._id },
        {
          $set: updateDoc,
          $unset: {
            adjustmentType: '',
            adjustmentPieces: '',
            adjustmentRate: '',
            adjustmentAmount: '',
          },
        }
      );
      migratedCount++;
    }

    console.log(`✅ Successfully migrated ${migratedCount} wholesaler entries.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateAdjustmentFields();
