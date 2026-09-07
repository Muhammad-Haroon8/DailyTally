const Customer = require('../models/Customer');
const Entry = require('../models/Entry');
const User = require('../models/User');
const { generateReportPdf } = require('../services/pdfReportService');

/**
 * Generates and streams PDF report for customer
 * GET /api/customers/:customerId/report/pdf?startDate=...&endDate=...
 */
const generateCustomerReportPdf = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate: rawStartDate, endDate: rawEndDate } = req.query;

    // 1. Verify customer ownership
    const customer = await Customer.findOne({
      _id: customerId,
      userId: req.userId,
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or unauthorized' });
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
    // openingBalance = SUM(items before startDate) - SUM(payments before startDate)
    const priorEntries = await Entry.aggregate([
      {
        $match: {
          customerId: customer._id,
          entryDate: { $lt: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalItems: {
            $sum: { $cond: [{ $eq: ['$type', 'item'] }, '$amount', 0] },
          },
          totalPayments: {
            $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] },
          },
        },
      },
    ]);

    const openingBalance =
      priorEntries.length > 0
        ? Math.round((priorEntries[0].totalItems - priorEntries[0].totalPayments) * 100) / 100
        : 0;

    // 4. Fetch entries in the range [startDate, endDate], sorted oldest first (chronological order)
    const rangeEntries = await Entry.find({
      customerId: customer._id,
      entryDate: { $gte: startDate, $lte: endDate },
    }).sort({
      entryDate: 1,
      createdAt: 1,
    });

    let totalItems = 0;
    let totalPayments = 0;

    // Assemble structured lines according to generic report data shape
    const lines = rangeEntries.map((entry) => {
      const isItem = entry.type === 'item';

      if (isItem) {
        totalItems += entry.amount;
        return {
          date: entry.entryDate,
          type: 'debit',
          typeBadgeText: 'UDHAAR',
          mainLabel: `${entry.itemName || 'Item'} (${entry.quantity} x Rs.${entry.rate})`,
          mainAmount: entry.amount,
          subLines: [],
          lineTotal: entry.amount,
          note: entry.note,
          entryTime: entry.entryTime,
        };
      } else {
        totalPayments += entry.amount;
        return {
          date: entry.entryDate,
          type: 'credit',
          typeBadgeText: 'WASOOL',
          mainLabel: `Wasool Raqam${entry.note ? ` (${entry.note})` : ''}`,
          mainAmount: entry.amount,
          subLines: [],
          lineTotal: entry.amount,
          note: entry.note,
          entryTime: entry.entryTime,
        };
      }
    });

    totalItems = Math.round(totalItems * 100) / 100;
    totalPayments = Math.round(totalPayments * 100) / 100;
    const closingBalance = Math.round((openingBalance + totalItems - totalPayments) * 100) / 100;

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const safeCustomerName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Hisab_${safeCustomerName}_${startStr}_to_${endStr}.pdf`;

    // 5. Build structured reportData for the shared renderer
    const reportData = {
      shopName,
      entityLabel: 'Customer',
      entityName: customer.name,
      entityPhone: customer.phone || '',
      dateRangeLabel: `${startStr}  to  ${endStr}`,
      openingBalance,
      lines,
      totals: {
        totalDebit: totalItems,
        totalCredit: totalPayments,
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
    console.error('❌ [PDF Generation Error]:', {
      message: error.message,
      stack: error.stack,
      customerId: req.params?.customerId,
      dates: { startDate: req.query?.startDate, endDate: req.query?.endDate },
    });
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server error while generating PDF report',
        details: error.message || String(error),
        stack: error.stack,
      });
    }
  }
};

module.exports = {
  generateCustomerReportPdf,
};
