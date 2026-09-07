// backend/scripts/testWholesalerFullFlow.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Wholesaler = require('../models/Wholesaler');
const WholesalerEntry = require('../models/WholesalerEntry');
const { generateReportPdf } = require('../services/pdfReportService');

async function testEndpointSimulation() {
  await mongoose.connect(process.env.MONGODB_URI);
  const wholesaler = await Wholesaler.findOne();
  
  const startDate = new Date('2026-09-01T00:00:00.000Z');
  const endDate = new Date('2026-09-30T23:59:59.999Z');

  // Compute opening balance before Sept 1
  const prior = await WholesalerEntry.aggregate([
    { $match: { wholesalerId: wholesaler._id, entryDate: { $lt: startDate } } },
    { $group: {
      _id: null,
      totalPurchases: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$amount', 0] } },
      totalPayments: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] } },
      totalAdvances: { $sum: { $cond: [{ $eq: ['$type', 'advance'] }, '$amount', 0] } },
    }},
  ]);
  const openingBalance = prior.length > 0 ? (prior[0].totalPurchases - prior[0].totalPayments - prior[0].totalAdvances) : 0;

  const rangeEntries = await WholesalerEntry.find({
    wholesalerId: wholesaler._id,
    entryDate: { $gte: startDate, $lte: endDate },
  }).sort({ entryDate: 1, createdAt: 1 });

  let totalKharedari = 0, totalPayment = 0, totalAdvance = 0;
  const lines = rangeEntries.map((entry) => {
    if (entry.type === 'purchase') {
      totalKharedari += entry.amount;
      const subLines = [];
      (entry.extraItems || []).forEach(ex => {
        subLines.push({ label: `+ Extra: ${ex.itemName} ${ex.pieces}pcs ÷ 2 × Rs.${ex.rate}`, amount: ex.amount });
      });
      (entry.shortageItems || []).forEach(sh => {
        subLines.push({ label: `− Kam: ${sh.itemName} ${sh.pieces}pcs ÷ 2 × Rs.${sh.rate}`, amount: -Math.abs(sh.amount) });
      });
      return {
        date: entry.entryDate,
        type: 'debit',
        typeBadgeText: 'KHAREDARI',
        mainLabel: `${entry.quantity} ${entry.itemName || 'Item'} @ Rs.${entry.rate.toLocaleString()}`,
        mainAmount: entry.baseAmount,
        subLines,
        lineTotal: entry.amount,
      };
    } else if (entry.type === 'advance') {
      totalAdvance += entry.amount;
      return {
        date: entry.entryDate,
        type: 'credit',
        typeBadgeText: 'ADVANCE',
        mainLabel: `Advance Diya${entry.note ? ` (${entry.note})` : ''}`,
        mainAmount: entry.amount,
        subLines: [],
        lineTotal: entry.amount,
      };
    } else {
      totalPayment += entry.amount;
      return {
        date: entry.entryDate,
        type: 'credit',
        typeBadgeText: 'PAYMENT',
        mainLabel: 'Payment',
        mainAmount: entry.amount,
        subLines: [],
        lineTotal: entry.amount,
      };
    }
  });

  const closingBalance = openingBalance + totalKharedari - totalPayment - totalAdvance;

  const reportData = {
    shopName: 'Karobar Hisab',
    entityLabel: 'Wholesaler',
    entityName: wholesaler.name,
    entityPhone: wholesaler.phone,
    dateRangeLabel: '2026-09-01  to  2026-09-30',
    openingBalance,
    lines,
    totals: {
      totalDebit: totalKharedari,
      totalCredit: totalPayment,
      totalAdvance,
      closingBalance,
    },
  };

  console.log('Report data assembled:');
  console.log(JSON.stringify(reportData, null, 2));

  const buffer = await generateReportPdf(reportData);
  console.log('Generated PDF buffer size:', buffer.length, 'bytes');
  process.exit(0);
}
testEndpointSimulation();
