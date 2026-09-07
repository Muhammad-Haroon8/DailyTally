// services/pdfReportService.js
// Shared, generic, robust PDF report generator for Customer and Wholesaler modules using PDFKit

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

/**
 * Generates a PDF buffer from a generic, structured reportData object
 * @param {Object} reportData
 * @param {string} reportData.shopName
 * @param {string} reportData.entityLabel - "Customer" | "Wholesaler"
 * @param {string} reportData.entityName
 * @param {string} reportData.entityPhone
 * @param {string} reportData.dateRangeLabel - e.g. "2026-09-01  to  2026-09-30"
 * @param {number} reportData.openingBalance
 * @param {Array<Object>} reportData.lines - Chronological entry lines
 *   line: {
 *     date: "2026-09-04",
 *     type: "debit" | "credit",
 *     typeBadgeText: "KHAREDARI" | "PAYMENT" | "ADVANCE" | "UDHAAR" | "WASOOL",
 *     mainLabel: string,
 *     mainAmount: number,
 *     subLines: Array<{ label: string, amount: number }>,
 *     lineTotal: number,
 *     note?: string,
 *     entryTime?: string
 *   }
 * @param {Object} reportData.totals
 *   totalDebit: number
 *   totalCredit: number
 *   totalAdvance?: number (optional, for wholesalers)
 *   closingBalance: number
 * @returns {Promise<Buffer>}
 */
const generateReportPdf = async (reportData) => {
  const {
    shopName = 'DAILY TALLY / KAROBAR HISAB',
    entityLabel = 'Customer',
    entityName = '',
    entityPhone = '',
    dateRangeLabel = '',
    openingBalance = 0,
    lines = [],
    totals = {},
  } = reportData;

  const isWholesaler = entityLabel.toLowerCase() === 'wholesaler';

  // Fonts check (Arial unicode font for safe rendering)
  const regularFontPath = path.resolve(__dirname, '..', 'fonts', 'arial.ttf');
  const boldFontPath = path.resolve(__dirname, '..', 'fonts', 'arialbd.ttf');
  const hasUnicodeFont = fs.existsSync(regularFontPath);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    font: hasUnicodeFont ? regularFontPath : undefined,
  });

  if (hasUnicodeFont) {
    doc.registerFont('AppFont', regularFontPath);
    if (fs.existsSync(boldFontPath)) {
      doc.registerFont('AppFont-Bold', boldFontPath);
    } else {
      doc.registerFont('AppFont-Bold', regularFontPath);
    }
  }

  const fontRegular = hasUnicodeFont ? 'AppFont' : 'Helvetica';
  const fontBold = hasUnicodeFont ? 'AppFont-Bold' : 'Helvetica-Bold';

  // Buffer in memory for Vercel serverless safety
  const chunks = [];
  const pdfPromise = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
  });

  // ================= 1. HEADER =================
  doc.fillColor('#0F6E56').fontSize(20).font(fontBold).text(shopName, { align: 'center' });
  doc.fillColor('#5F5E5A').fontSize(11).font(fontRegular).text(
    isWholesaler ? 'Wholesaler / Supplier Hisab Statement' : 'Gahak Hisab Statement',
    { align: 'center' }
  );
  doc.moveDown(0.7);

  // Info Box
  const boxTop = doc.y;
  doc.rect(40, boxTop, 515, 60).fillAndStroke('#F8F7F4', '#E5E3DC');

  doc.fillColor('#2C2C2A').fontSize(13).font(fontBold)
    .text(`${entityLabel}: ${entityName}`, 55, boxTop + 12);

  if (entityPhone) {
    doc.fillColor('#5F5E5A').fontSize(10).font(fontRegular)
      .text(`Phone: ${entityPhone}`, 55, boxTop + 34);
  }

  doc.fillColor('#0F6E56').fontSize(11).font(fontBold)
    .text(`Date Range: ${dateRangeLabel}`, 300, boxTop + 14, { align: 'right', width: 240 });

  doc.fillColor('#5F5E5A').fontSize(9).font(fontRegular)
    .text(`Generated: ${new Date().toLocaleString()}`, 300, boxTop + 34, { align: 'right', width: 240 });

  doc.y = boxTop + 75;

  // ================= 2. OPENING BALANCE BANNER =================
  const bannerY = doc.y;
  doc.rect(40, bannerY, 515, 28).fillAndStroke('#FAF5EE', '#EBDCC8');
  doc.fillColor('#BA7517').fontSize(11).font(fontBold)
    .text('Pichla Baqaya (Opening Balance Carried Forward):', 52, bannerY + 8);
  doc.text(`Rs. ${openingBalance.toLocaleString()}`, 380, bannerY + 8, { align: 'right', width: 160 });

  doc.y = bannerY + 38;

  // ================= 3. TABLE HEADER =================
  const tableTop = doc.y;
  doc.rect(40, tableTop, 515, 22).fillAndStroke('#0F6E56', '#0F6E56');

  doc.fillColor('#FFFFFF').fontSize(10).font(fontBold);
  doc.text('Date', 48, tableTop + 6, { width: 75 });
  doc.text('Type', 125, tableTop + 6, { width: 70 });
  doc.text('Details / Breakdown', 200, tableTop + 6, { width: 220 });
  doc.text('Amount (Rs.)', 425, tableTop + 6, { width: 120, align: 'right' });

  doc.y = tableTop + 24;

  // ================= 4. TABLE ROWS =================
  let currentY = doc.y;
  doc.font(fontRegular).fontSize(9);

  if (!lines || lines.length === 0) {
    doc.rect(40, currentY, 515, 30).fillAndStroke('#FFFFFF', '#E5E3DC');
    doc.fillColor('#5F5E5A').text('Is arsay me koi entry record nahi hui.', 50, currentY + 10, { align: 'center', width: 495 });
    currentY += 30;
  } else {
    lines.forEach((line, index) => {
      const hasSublines = Array.isArray(line.subLines) && line.subLines.length > 0;

      // Calculate needed row height
      // Default single line: 26px
      // With sublines: padding (12px) + base (16px) + (sublines * 15px) + total (18px) + bottom gap (6px)
      let rowHeight = 26;
      if (hasSublines) {
        rowHeight = 12 + 16 + (line.subLines.length * 15) + 18 + 6;
      }

      // Check for page break
      if (currentY + rowHeight > 730) {
        doc.addPage();
        currentY = 40;
      }

      const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FBFBFA';
      doc.rect(40, currentY, 515, rowHeight).fillAndStroke(rowBg, '#E5E3DC');

      // Date column
      let formattedDate = line.date;
      try {
        formattedDate = new Date(line.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch (err) {
        formattedDate = line.date;
      }
      doc.fillColor('#2C2C2A').font(fontRegular).fontSize(9).text(formattedDate, 48, currentY + 7, { width: 75 });

      // Type Badge column
      const badgeText = (line.typeBadgeText || (line.type === 'debit' ? 'DEBIT' : 'CREDIT')).toUpperCase();
      let badgeColor = '#3B6D11'; // green for payment/wasool
      if (badgeText === 'KHAREDARI' || badgeText === 'UDHAAR' || line.type === 'debit') {
        badgeColor = '#A32D2D'; // red
      } else if (badgeText === 'ADVANCE') {
        badgeColor = '#BA7517'; // amber
      }

      doc.fillColor(badgeColor).font(fontBold).fontSize(9)
        .text(badgeText, 125, currentY + 7, { width: 70 });

      // Details / Breakdown column & Amount
      if (!hasSublines) {
        // Single row without sublines (e.g. standard payment, advance, or simple item)
        doc.font(fontRegular).fillColor('#2C2C2A').fontSize(9);
        let desc = line.mainLabel || '';
        if (line.note) desc += ` [${line.note}]`;
        if (line.entryTime) desc += ` - ${line.entryTime}`;

        doc.text(desc, 200, currentY + 7, { width: 220, ellipsis: true });

        // Amount on right
        const amountDisplay = line.type === 'credit'
          ? `- Rs. ${(line.lineTotal || line.mainAmount || 0).toLocaleString()}`
          : `Rs. ${(line.lineTotal || line.mainAmount || 0).toLocaleString()}`;

        doc.fillColor(badgeColor).font(fontBold).fontSize(9)
          .text(amountDisplay, 425, currentY + 7, { width: 120, align: 'right' });
      } else {
        // Structured Entry with Sub-lines (Base -> Extras -> Shortages -> Total)
        let innerY = currentY + 6;

        // a. Main / Base line
        doc.font(fontBold).fillColor('#2C2C2A').fontSize(9);
        doc.text(line.mainLabel, 200, innerY, { width: 155 });
        doc.text(`= Rs. ${(line.mainAmount || 0).toLocaleString()}`, 355, innerY, { width: 65, align: 'right' });
        innerY += 15;

        // b. Sub-lines (extras, shortages)
        line.subLines.forEach((sub) => {
          const isNegative = sub.amount < 0 || sub.label.startsWith('−') || sub.label.startsWith('-');
          doc.font(fontRegular).fillColor(isNegative ? '#C62828' : '#2E7D32').fontSize(8.5);
          doc.text(sub.label, 205, innerY, { width: 150 });
          doc.text(`= ${isNegative ? '-' : ''}Rs. ${Math.abs(sub.amount).toLocaleString()}`, 355, innerY, { width: 65, align: 'right' });
          innerY += 15;
        });

        // c. Line Total
        doc.font(fontBold).fillColor('#0F6E56').fontSize(9);
        doc.text('= Entry Total:', 200, innerY, { width: 155 });
        doc.text(`Rs. ${(line.lineTotal || 0).toLocaleString()}`, 355, innerY, { width: 65, align: 'right' });

        // Big line total on right column
        doc.fillColor('#A32D2D').font(fontBold).fontSize(10)
          .text(`Rs. ${(line.lineTotal || 0).toLocaleString()}`, 425, currentY + (rowHeight / 2) - 6, { width: 120, align: 'right' });
      }

      currentY += rowHeight;
    });
  }

  // ================= 5. TOTALS SUMMARY BOX =================
  if (currentY > 620) {
    doc.addPage();
    currentY = 40;
  }

  currentY += 15;
  const hasAdvance = totals.totalAdvance !== undefined && totals.totalAdvance !== null;
  const hasSettlement = totals.totalAdvanceSettlement !== undefined && totals.totalAdvanceSettlement !== null;
  const hasOverallPool = totals.overallAdvancePoolRemaining !== undefined && totals.overallAdvancePoolRemaining !== null;

  // Compute needed height
  let boxHeight = 76;
  if (isWholesaler) {
    boxHeight = 76;
    if (hasSettlement) boxHeight += 18;
    if (hasAdvance && totals.totalAdvance > 0) boxHeight += 18;
    if (hasOverallPool) boxHeight += 18;
  }

  doc.rect(40, currentY, 515, boxHeight).fillAndStroke('#F8F7F4', '#0F6E56');

  const debitLabel = isWholesaler ? 'Total Kharedari (Kul Bill):' : 'Total Udhaar (Items):';
  const normalPayAmt = totals.totalNormalPayment !== undefined ? totals.totalNormalPayment : totals.totalCredit;
  const normalPayLabel = isWholesaler ? 'Total Payment (Cash/Bank):' : 'Total Wasool (Payments):';

  let lineOffset = 10;
  doc.fillColor('#2C2C2A').fontSize(9.5).font(fontRegular)
    .text(debitLabel, 60, currentY + lineOffset);
  doc.fillColor('#A32D2D').font(fontBold)
    .text(`Rs. ${(totals.totalDebit || 0).toLocaleString()}`, 210, currentY + lineOffset, { align: 'right', width: 110 });
  lineOffset += 18;

  doc.fillColor('#2C2C2A').font(fontRegular)
    .text(normalPayLabel, 60, currentY + lineOffset);
  doc.fillColor('#3B6D11').font(fontBold)
    .text(`Rs. ${(normalPayAmt || 0).toLocaleString()}`, 210, currentY + lineOffset, { align: 'right', width: 110 });
  lineOffset += 18;

  if (isWholesaler && hasSettlement) {
    doc.fillColor('#2C2C2A').font(fontRegular)
      .text('Total Advance Se Kata:', 60, currentY + lineOffset);
    doc.fillColor('#0F6E56').font(fontBold)
      .text(`Rs. ${(totals.totalAdvanceSettlement || 0).toLocaleString()}`, 210, currentY + lineOffset, { align: 'right', width: 110 });
    lineOffset += 18;
  }

  if (isWholesaler && hasAdvance && totals.totalAdvance > 0) {
    doc.fillColor('#2C2C2A').font(fontRegular)
      .text('Advance Diya Gaya (Is Arsay Me):', 60, currentY + lineOffset);
    doc.fillColor('#BA7517').font(fontBold)
      .text(`Rs. ${(totals.totalAdvance || 0).toLocaleString()}`, 210, currentY + lineOffset, { align: 'right', width: 110 });
    lineOffset += 18;
  }

  if (isWholesaler && hasOverallPool) {
    doc.fillColor('#2C2C2A').font(fontRegular)
      .text('Advance Baqi (Overall Remaining):', 60, currentY + lineOffset);
    doc.fillColor('#BA7517').font(fontBold)
      .text(`Rs. ${(totals.overallAdvancePoolRemaining || 0).toLocaleString()}`, 210, currentY + lineOffset, { align: 'right', width: 110 });
    lineOffset += 18;
  }

  const netLabel = isWholesaler ? 'Baqi Baqaya:' : 'Arsay Ka Net Baqaya:';
  doc.fillColor('#2C2C2A').font(fontRegular)
    .text(netLabel, 60, currentY + lineOffset);
  const periodNet = (totals.totalDebit || 0) - (totals.totalCredit || 0);
  doc.fillColor(periodNet >= 0 ? '#A32D2D' : '#3B6D11').font(fontBold)
    .text(`${periodNet >= 0 ? '' : '- '}Rs. ${Math.abs(periodNet).toLocaleString()}`, 210, currentY + lineOffset, { align: 'right', width: 110 });

  // Big Closing Balance on Right side of totals box
  const rightBoxHeight = boxHeight - 16;
  doc.rect(340, currentY + 8, 200, rightBoxHeight).fillAndStroke('#0F6E56', '#0F6E56');

  let closingTitle = 'CLOSING BALANCE';
  if (isWholesaler) {
    closingTitle = (totals.closingBalance || 0) >= 0 ? 'TOTAL BAQAYA' : 'WASOOLI ZIYADA (CREDIT)';
  }

  doc.fillColor('#FFFFFF').fontSize(10).font(fontBold)
    .text(closingTitle, 345, currentY + 16, { align: 'center', width: 190 });
  doc.fontSize(15).text(`Rs. ${Math.abs(totals.closingBalance || 0).toLocaleString()}`, 345, currentY + 38, { align: 'center', width: 190 });

  // ================= 6. FOOTER =================
  doc.fontSize(8).fillColor('#7A7975').font(fontRegular)
    .text('Daily Tally - Software Hisab & Ledger. Generated securely.', 40, 780, { align: 'center', width: 515 });

  doc.end();
  return pdfPromise;
};

module.exports = {
  generateReportPdf,
};
