const Wholesaler = require('../models/Wholesaler');
const WholesalerEntry = require('../models/WholesalerEntry');
const User = require('../models/User');
const { generateReportPdf } = require('../services/pdfReportService');

/**
 * Generates and streams PDF report for wholesaler
 * GET /api/wholesalers/:wholesalerId/report/pdf?startDate=...&endDate=...
 */
const generateWholesalerReportPdf = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { startDate: rawStartDate, endDate: rawEndDate } = req.query;

    // 1. Verify wholesaler ownership
    const wholesaler = await Wholesaler.findOne({
      _id: wholesalerId,
      userId: req.userId,
    });

    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found or unauthorized' });
    }

    // Optional user/shop profile for header
    const user = await User.findById(req.userId).select('name phone').lean();
    const shopName = user?.name || 'DAILY TALLY / KAROBAR HISAB';

    // 2. Validate dates
    if (!rawStartDate || !rawEndDate) {
      return res.status(400).json({ error: 'Both startDate and endDate are required query parameters' });
    }

    const startDate = new Date(rawStartDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(rawEndDate);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid startDate or endDate format' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ error: 'startDate cannot be after endDate' });
    }

    // 3. Compute Opening Balance (strictly before startDate)
    // openingBalance = SUM(purchases before startDate) - SUM(payments + settlements before startDate)
    const priorEntries = await WholesalerEntry.aggregate([
      {
        $match: {
          wholesalerId: wholesaler._id,
          entryDate: { $lt: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalPurchases: {
            $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$amount', 0] },
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
    ]);

    const openingBalance =
      priorEntries.length > 0
        ? Math.round((priorEntries[0].totalPurchases - priorEntries[0].totalPayments) * 100) / 100
        : 0;

    // 4. Fetch entries in the range [startDate, endDate], sorted oldest first (chronological order)
    const rangeEntries = await WholesalerEntry.find({
      wholesalerId: wholesaler._id,
      entryDate: { $gte: startDate, $lte: endDate },
    }).sort({
      entryDate: 1,
      createdAt: 1,
    });

    let totalKharedari = 0;
    let totalNormalPayment = 0;
    let totalAdvance = 0;
    let totalAdvanceSettlement = 0;

    // Assemble structured lines according to generic report data shape
    const lines = rangeEntries.map((entry) => {
      const isPurchase = entry.type === 'purchase';
      const isAdvance = entry.type === 'advance';
      const isSettlement = entry.type === 'advanceSettlement';

      if (isPurchase) {
        totalKharedari += entry.amount;

        const baseAmt = entry.baseAmount !== undefined ? entry.baseAmount : (entry.quantity * entry.rate);
        const subLines = [];

        // Extra items breakdown
        if (Array.isArray(entry.extraItems) && entry.extraItems.length > 0) {
          entry.extraItems.forEach((ex) => {
            const exAmt = ex.amount !== undefined ? ex.amount : Math.round((ex.pieces / 2) * ex.rate);
            subLines.push({
              label: `+ Extra: ${ex.itemName || 'Item'} ${ex.pieces}pcs ÷ 2 × Rs.${ex.rate}`,
              amount: exAmt,
            });
          });
        }

        // Shortage items breakdown
        if (Array.isArray(entry.shortageItems) && entry.shortageItems.length > 0) {
          entry.shortageItems.forEach((sh) => {
            const shAmt = sh.amount !== undefined ? sh.amount : Math.round((sh.pieces / 2) * sh.rate);
            subLines.push({
              label: `− Kam: ${sh.itemName || 'Item'} ${sh.pieces}pcs ÷ 2 × Rs.${sh.rate}`,
              amount: -Math.abs(shAmt),
            });
          });
        }

        return {
          date: entry.entryDate,
          type: 'debit',
          typeBadgeText: 'KHAREDARI',
          mainLabel: `${entry.quantity} ${entry.itemName || 'Item'} @ Rs.${entry.rate.toLocaleString()}`,
          mainAmount: baseAmt,
          subLines,
          lineTotal: entry.amount,
          note: entry.note,
          entryTime: entry.entryTime,
        };
      } else if (isAdvance) {
        totalAdvance += entry.amount;
        return {
          date: entry.entryDate,
          type: 'credit',
          typeBadgeText: 'ADVANCE',
          mainLabel: `Advance Diya: Rs. ${entry.amount.toLocaleString()}${entry.note ? ` (${entry.note})` : ''}`,
          mainAmount: entry.amount,
          subLines: [],
          lineTotal: entry.amount,
          note: entry.note,
          entryTime: entry.entryTime,
        };
      } else if (isSettlement) {
        // Advance Settlement: deducted from advance pool to reduce bill
        totalAdvanceSettlement += entry.amount;
        return {
          date: entry.entryDate,
          type: 'credit',
          typeBadgeText: 'ADVANCE SE KATA',
          mainLabel: `Advance se Rs. ${entry.amount.toLocaleString()} kaata gaya${entry.note ? ` (${entry.note})` : ''}`,
          mainAmount: entry.amount,
          subLines: [],
          lineTotal: entry.amount,
          note: entry.note,
          entryTime: entry.entryTime,
        };
      } else {
        // Normal payment (cash / bank)
        totalNormalPayment += entry.amount;
        return {
          date: entry.entryDate,
          type: 'credit',
          typeBadgeText: 'PAYMENT',
          mainLabel: `Payment (Cash/Bank): Rs. ${entry.amount.toLocaleString()}${entry.note ? ` (${entry.note})` : ''}`,
          mainAmount: entry.amount,
          subLines: [],
          lineTotal: entry.amount,
          note: entry.note,
          entryTime: entry.entryTime,
        };
      }
    });

    totalKharedari = Math.round(totalKharedari * 100) / 100;
    totalNormalPayment = Math.round(totalNormalPayment * 100) / 100;
    totalAdvance = Math.round(totalAdvance * 100) / 100;
    totalAdvanceSettlement = Math.round(totalAdvanceSettlement * 100) / 100;
    
    // Total combined payment reducing bill = normal payment + advance settlement
    const totalPayment = Math.round((totalNormalPayment + totalAdvanceSettlement) * 100) / 100;
    
    // Closing Balance strictly: openingBalance + totalKharedari - (totalNormalPayment + totalAdvanceSettlement)
    const closingBalance = Math.round((openingBalance + totalKharedari - totalPayment) * 100) / 100;

    // Fetch overall lifetime advance pool remaining for context
    const overallAdvanceAgg = await WholesalerEntry.aggregate([
      { $match: { wholesalerId: wholesaler._id } },
      {
        $group: {
          _id: null,
          totalAdv: { $sum: { $cond: [{ $eq: ['$type', 'advance'] }, '$amount', 0] } },
          totalSet: { $sum: { $cond: [{ $eq: ['$type', 'advanceSettlement'] }, '$amount', 0] } },
        },
      },
    ]);
    const overallAdvancePoolRemaining = overallAdvanceAgg.length > 0
      ? Math.round((overallAdvanceAgg[0].totalAdv - overallAdvanceAgg[0].totalSet) * 100) / 100
      : 0;

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const safeWholesalerName = wholesaler.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Wholesaler_${safeWholesalerName}_${startStr}_to_${endStr}.pdf`;

    // 5. Build structured reportData for the shared renderer
    const reportData = {
      shopName,
      entityLabel: 'Wholesaler',
      entityName: wholesaler.name,
      entityPhone: wholesaler.phone || '',
      dateRangeLabel: `${startStr}  to  ${endStr}`,
      openingBalance,
      lines,
      totals: {
        totalDebit: totalKharedari,
        totalCredit: totalPayment,
        totalNormalPayment,
        totalAdvanceSettlement,
        totalAdvance,
        overallAdvancePoolRemaining,
        closingBalance,
      },
    };

    // 6. Generate PDF via shared service
    const pdfBuffer = await generateReportPdf(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('❌ [Wholesaler PDF Generation Error]:', {
      message: error.message,
      stack: error.stack,
      wholesalerId: req.params?.wholesalerId,
      dates: { startDate: req.query?.startDate, endDate: req.query?.endDate },
    });
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server error while generating Wholesaler PDF report',
        details: error.message || String(error),
      });
    }
  }
};

module.exports = {
  generateWholesalerReportPdf,
};
