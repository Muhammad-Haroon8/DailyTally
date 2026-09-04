// controllers/reportController.js
// Generates streamable PDF report statements for a customer over any date range using pdfkit

const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Customer = require('../models/Customer');
const Entry = require('../models/Entry');

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

    rangeEntries.forEach((e) => {
      if (e.type === 'item') {
        totalItems += e.amount;
      } else {
        totalPayments += e.amount;
      }
    });

    totalItems = Math.round(totalItems * 100) / 100;
    totalPayments = Math.round(totalPayments * 100) / 100;
    const closingBalance = Math.round((openingBalance + totalItems - totalPayments) * 100) / 100;

    // 5. Initialize PDFDocument (streamed directly to response)
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    // Clean filename
    const safeCustomerName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const filename = `Hisab_${safeCustomerName}_${startStr}_to_${endStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // ================= HEADER =================
    doc.fillColor('#0F6E56').fontSize(22).font('Helvetica-Bold').text('DAILY TALLY / KAROBAR HISAB', { align: 'center' });
    doc.fillColor('#5F5E5A').fontSize(11).font('Helvetica').text('Gahak Hisab Statement', { align: 'center' });
    doc.moveDown(0.8);

    // Customer Info & Date Box
    const boxTop = doc.y;
    doc.rect(40, boxTop, 515, 60).fillAndStroke('#F8F7F4', '#E5E3DC');

    doc.fillColor('#2C2C2A').fontSize(13).font('Helvetica-Bold')
      .text(`Gahak Name: ${customer.name}`, 55, boxTop + 12);

    if (customer.phone) {
      doc.fillColor('#5F5E5A').fontSize(10).font('Helvetica')
        .text(`Phone: ${customer.phone}`, 55, boxTop + 34);
    }

    doc.fillColor('#0F6E56').fontSize(11).font('Helvetica-Bold')
      .text(`Date Range: ${startStr}  to  ${endStr}`, 300, boxTop + 14, { align: 'right', width: 240 });

    doc.fillColor('#5F5E5A').fontSize(9).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, 300, boxTop + 34, { align: 'right', width: 240 });

    doc.y = boxTop + 75;

    // ================= OPENING BALANCE BANNER =================
    const bannerY = doc.y;
    doc.rect(40, bannerY, 515, 28).fillAndStroke('#FAF5EE', '#EBDCC8');
    doc.fillColor('#BA7517').fontSize(11).font('Helvetica-Bold')
      .text('↳ Pichla Baqaya (Opening Balance Carried Forward):', 52, bannerY + 8);
    doc.text(`Rs. ${openingBalance.toLocaleString()}`, 380, bannerY + 8, { align: 'right', width: 160 });

    doc.y = bannerY + 38;

    // ================= TABLE HEADER =================
    const tableTop = doc.y;
    doc.rect(40, tableTop, 515, 22).fillAndStroke('#0F6E56', '#0F6E56');

    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('Date', 48, tableTop + 6, { width: 75 });
    doc.text('Type', 125, tableTop + 6, { width: 65 });
    doc.text('Details / Note', 195, tableTop + 6, { width: 215 });
    doc.text('Amount (Rs.)', 415, tableTop + 6, { width: 130, align: 'right' });

    doc.y = tableTop + 24;

    // ================= TABLE ROWS =================
    let currentY = doc.y;
    doc.font('Helvetica').fontSize(9);

    if (rangeEntries.length === 0) {
      doc.rect(40, currentY, 515, 30).fillAndStroke('#FFFFFF', '#E5E3DC');
      doc.fillColor('#5F5E5A').text('Is arsay me koi transaction nahi hui.', 50, currentY + 10, { align: 'center', width: 495 });
      currentY += 30;
    } else {
      rangeEntries.forEach((entry, index) => {
        // Page break if near bottom
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }

        const isItem = entry.type === 'item';
        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FBFBFA';
        doc.rect(40, currentY, 515, 24).fillAndStroke(rowBg, '#E5E3DC');

        // Date
        const dateStr = new Date(entry.entryDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        doc.fillColor('#2C2C2A').text(dateStr, 48, currentY + 7, { width: 75 });

        // Type Pill Text
        doc.fillColor(isItem ? '#A32D2D' : '#3B6D11').font('Helvetica-Bold')
          .text(isItem ? 'UDHAAR' : 'WASOOL', 125, currentY + 7, { width: 65 });

        // Description
        doc.font('Helvetica').fillColor('#2C2C2A');
        let desc = isItem
          ? `${entry.itemName || 'Item'} (${entry.quantity} x Rs.${entry.rate})`
          : `Wasool Raqam ${entry.note ? `[${entry.note}]` : ''}`;
        if (entry.entryTime) desc += ` - ${entry.entryTime}`;

        doc.text(desc, 195, currentY + 7, { width: 215, ellipsis: true });

        // Amount
        const amtText = isItem ? `Rs. ${entry.amount.toLocaleString()}` : `+ Rs. ${entry.amount.toLocaleString()}`;
        doc.fillColor(isItem ? '#A32D2D' : '#3B6D11').font('Helvetica-Bold')
          .text(amtText, 415, currentY + 7, { width: 130, align: 'right' });

        currentY += 24;
      });
    }

    // ================= TOTALS SUMMARY BOX =================
    if (currentY > 660) {
      doc.addPage();
      currentY = 40;
    }

    currentY += 15;
    doc.rect(40, currentY, 515, 80).fillAndStroke('#F8F7F4', '#0F6E56');

    doc.fillColor('#2C2C2A').fontSize(10).font('Helvetica')
      .text('Total Udhaar (Items):', 60, currentY + 12);
    doc.fillColor('#A32D2D').font('Helvetica-Bold')
      .text(`Rs. ${totalItems.toLocaleString()}`, 200, currentY + 12, { align: 'right', width: 120 });

    doc.fillColor('#2C2C2A').font('Helvetica')
      .text('Total Wasool (Payments):', 60, currentY + 32);
    doc.fillColor('#3B6D11').font('Helvetica-Bold')
      .text(`Rs. ${totalPayments.toLocaleString()}`, 200, currentY + 32, { align: 'right', width: 120 });

    doc.fillColor('#2C2C2A').font('Helvetica')
      .text('Arsay Ka Net Hisab:', 60, currentY + 52);
    const periodNet = totalItems - totalPayments;
    doc.fillColor(periodNet >= 0 ? '#A32D2D' : '#3B6D11').font('Helvetica-Bold')
      .text(`${periodNet >= 0 ? '+' : '-'} Rs. ${Math.abs(periodNet).toLocaleString()}`, 200, currentY + 52, { align: 'right', width: 120 });

    // Big Closing Balance on Right side of totals box
    doc.rect(340, currentY + 8, 200, 64).fillAndStroke('#0F6E56', '#0F6E56');
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
      .text('CLOSING BALANCE', 345, currentY + 18, { align: 'center', width: 190 });
    doc.fontSize(16).text(`Rs. ${closingBalance.toLocaleString()}`, 345, currentY + 38, { align: 'center', width: 190 });

    // ================= FOOTER =================
    doc.fontSize(8).fillColor('#7A7975').font('Helvetica')
      .text('Daily Tally - Software Hisab & Ledger. Generated securely for customer record.', 40, 780, { align: 'center', width: 515 });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF report:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Server error while generating PDF report' });
    }
  }
};

module.exports = {
  generateCustomerReportPdf,
};
