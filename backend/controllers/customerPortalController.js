// controllers/customerPortalController.js
// Read-only customer portal controllers scoped strictly to req.customerId
// Zero create/update/delete endpoints allowed

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Entry = require('../models/Entry');
const User = require('../models/User');
const { generateReportPdf } = require('../services/pdfReportService');

/**
 * Calculates net balance for customer:
 * SUM(amount where type='item') - SUM(amount where type='payment')
 */
const getCustomerBalance = async (customerId) => {
  const objectId = new mongoose.Types.ObjectId(customerId);

  const result = await Entry.aggregate([
    { $match: { customerId: objectId } },
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
    {
      $project: {
        _id: 0,
        balance: { $subtract: ['$totalItems', '$totalPayments'] },
      },
    },
  ]);

  return result.length > 0 ? Math.round(result[0].balance * 100) / 100 : 0;
};

/**
 * Returns customer profile, shop info, and lifetime financial totals
 * GET /api/customer-portal/me
 */
const getCustomerProfileAndSummary = async (req, res) => {
  try {
    const customer = req.customer; // Pre-loaded by customerAuthMiddleware

    // Compute all-time totals
    const allEntries = await Entry.find({ customerId: customer._id });

    let totalUdhaar = 0;
    let totalWasool = 0;

    allEntries.forEach((entry) => {
      if (entry.type === 'item') {
        totalUdhaar += entry.amount;
      } else if (entry.type === 'payment') {
        totalWasool += entry.amount;
      }
    });

    totalUdhaar = Math.round(totalUdhaar * 100) / 100;
    totalWasool = Math.round(totalWasool * 100) / 100;
    const balance = Math.round((totalUdhaar - totalWasool) * 100) / 100;

    const shopOwner = customer.userId;

    return res.status(200).json({
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
      },
      shop: {
        id: shopOwner?._id || customer.userId,
        name: shopOwner?.name || 'Karobar Hisab Shop',
        phone: shopOwner?.phone || '',
      },
      totals: {
        totalUdhaar,
        totalWasool,
        baqiBaqaya: balance,
        balance,
      },
    });
  } catch (error) {
    console.error('Customer portal me error:', error);
    return res.status(500).json({ error: 'Server error while fetching customer profile' });
  }
};

/**
 * Returns customer's complete history grouped by month with running opening & closing balances
 * GET /api/customer-portal/entries
 */
const getCustomerPortalEntries = async (req, res) => {
  try {
    const customerId = req.customerId;
    const customer = req.customer;

    // Fetch all entries in chronological order (oldest first) to compute running balances
    const allEntries = await Entry.find({ customerId }).sort({
      entryDate: 1,
      createdAt: 1,
    });

    // 1. Group entries chronologically by month key "YYYY-MM"
    const monthMap = new Map();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    allEntries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          year,
          monthIndex: monthNum,
          monthLabel: `${monthNames[monthNum]} ${year}`,
          entries: [],
          monthNet: 0,
          monthUdhaar: 0,
          monthWasool: 0,
        });
      }

      const monthGroup = monthMap.get(monthKey);
      monthGroup.entries.push(entry);

      if (entry.type === 'item') {
        monthGroup.monthNet += entry.amount;
        monthGroup.monthUdhaar += entry.amount;
      } else {
        monthGroup.monthNet -= entry.amount;
        monthGroup.monthWasool += entry.amount;
      }
    });

    // 2. Sort months chronologically to chain balances
    const chronologicalMonths = Array.from(monthMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    let runningBalance = 0;
    const processedMonths = chronologicalMonths.map((m) => {
      const openingBalance = Math.round(runningBalance * 100) / 100;
      const monthNet = Math.round(m.monthNet * 100) / 100;
      const closingBalance = Math.round((openingBalance + monthNet) * 100) / 100;

      runningBalance = closingBalance;

      // Within month, sort entries newest first for display
      const displayEntries = [...m.entries].reverse();

      return {
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        openingBalance,
        monthNet,
        monthUdhaar: Math.round(m.monthUdhaar * 100) / 100,
        monthWasool: Math.round(m.monthWasool * 100) / 100,
        closingBalance,
        entries: displayEntries,
      };
    });

    // 3. For mobile display: newest month first
    const monthsNewestFirst = [...processedMonths].reverse();

    // Lifetime totals
    let customerTotalUdhaar = 0;
    let customerTotalWasool = 0;
    allEntries.forEach((entry) => {
      if (entry.type === 'item') {
        customerTotalUdhaar += entry.amount;
      } else {
        customerTotalWasool += entry.amount;
      }
    });
    customerTotalUdhaar = Math.round(customerTotalUdhaar * 100) / 100;
    customerTotalWasool = Math.round(customerTotalWasool * 100) / 100;
    const overallBalance = await getCustomerBalance(customerId);

    return res.status(200).json({
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        totalUdhaar: customerTotalUdhaar,
        totalWasool: customerTotalWasool,
        balance: overallBalance,
      },
      shop: {
        id: customer.userId?._id || customer.userId,
        name: customer.userId?.name || 'Karobar Hisab Shop',
        phone: customer.userId?.phone || '',
      },
      months: monthsNewestFirst,
      entries: allEntries.slice().reverse(),
    });
  } catch (error) {
    console.error('Customer portal entries error:', error);
    return res.status(500).json({ error: 'Server error while fetching customer entries' });
  }
};

/**
 * Generates and streams PDF report statement for customer
 * GET /api/customer-portal/report/pdf?startDate=...&endDate=...
 */
const getCustomerPortalPdf = async (req, res) => {
  try {
    const customerId = req.customerId;
    const customer = req.customer;
    const { startDate: rawStartDate, endDate: rawEndDate } = req.query;

    const shopOwner = customer.userId;
    const shopName = shopOwner?.name || 'DAILY TALLY / KAROBAR HISAB';

    // If dates are provided, validate; otherwise generate all-time report
    let startDate = null;
    let endDate = null;
    let dateRangeLabel = 'All-Time Statement';

    if (rawStartDate && rawEndDate) {
      startDate = new Date(rawStartDate);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(rawEndDate);
      endDate.setHours(23, 59, 59, 999);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const formatDateStr = (d) =>
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      dateRangeLabel = `${formatDateStr(startDate)}  to  ${formatDateStr(endDate)}`;
    }

    // Compute Opening Balance
    let openingBalance = 0;
    const matchQuery = { customerId: customer._id };

    if (startDate) {
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
            totalItems: { $sum: { $cond: [{ $eq: ['$type', 'item'] }, '$amount', 0] } },
            totalPayments: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] } },
          },
        },
      ]);

      if (priorEntries.length > 0) {
        openingBalance =
          Math.round((priorEntries[0].totalItems - priorEntries[0].totalPayments) * 100) / 100;
      }

      matchQuery.entryDate = { $gte: startDate, $lte: endDate };
    }

    // Fetch entries in range
    const entries = await Entry.find(matchQuery).sort({ entryDate: 1, createdAt: 1 });

    let totalDebit = 0;
    let totalCredit = 0;

    const lines = entries.map((entry) => {
      const isUdhaar = entry.type === 'item';
      const d = new Date(entry.entryDate);
      const dateFormatted = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      if (isUdhaar) {
        totalDebit += entry.amount;
      } else {
        totalCredit += entry.amount;
      }

      return {
        date: dateFormatted,
        type: isUdhaar ? 'debit' : 'credit',
        typeBadgeText: isUdhaar ? 'UDHAAR' : 'WASOOL',
        mainLabel: isUdhaar
          ? `${entry.quantity}x ${entry.itemName} (@ Rs. ${entry.rate})`
          : 'Cash Payment Received',
        mainAmount: entry.amount,
        subLines: [],
        lineTotal: entry.amount,
        note: entry.note || '',
        entryTime: entry.entryTime || '',
      };
    });

    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;
    const closingBalance = Math.round((openingBalance + totalDebit - totalCredit) * 100) / 100;

    const reportData = {
      shopName,
      entityLabel: 'Customer',
      entityName: customer.name,
      entityPhone: customer.phone,
      dateRangeLabel,
      openingBalance,
      lines,
      totals: {
        totalDebit,
        totalCredit,
        closingBalance,
      },
    };

    const pdfBuffer = await generateReportPdf(reportData);

    const safeName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Statement_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Customer portal PDF error:', error);
    return res.status(500).json({ error: 'Server error while generating statement PDF' });
  }
};

module.exports = {
  getCustomerProfileAndSummary,
  getCustomerPortalEntries,
  getCustomerPortalPdf,
};
