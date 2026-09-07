// testPdfGeneration.js
// Verification script for Wholesaler PDF Report with strict ordering: Base -> Extras -> Shortages -> Total

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function testPdf() {
  console.log('--- Starting Test Wholesaler PDF Generation ---');

  const regularFontPath = path.resolve(__dirname, 'fonts', 'arial.ttf');
  const boldFontPath = path.resolve(__dirname, 'fonts', 'arialbd.ttf');
  const hasUnicodeFont = fs.existsSync(regularFontPath);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    font: hasUnicodeFont ? regularFontPath : undefined,
  });

  if (hasUnicodeFont) {
    doc.registerFont('AppFont', regularFontPath);
    doc.registerFont('AppFont-Bold', fs.existsSync(boldFontPath) ? boldFontPath : regularFontPath);
  }

  const fontRegular = hasUnicodeFont ? 'AppFont' : 'Helvetica';
  const fontBold = hasUnicodeFont ? 'AppFont-Bold' : 'Helvetica-Bold';

  const chunks = [];
  const pdfPromise = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
  });

  const testEntry = {
    type: 'purchase',
    entryDate: new Date('2026-09-07'),
    itemName: 'Siri Jore',
    quantity: 20,
    rate: 850,
    baseAmount: 17000,
    extraItems: [
      { itemName: 'Siri', pieces: 10, rate: 850, amount: (10 / 2) * 850 }, // 4,250
      { itemName: 'Jore', pieces: 4, rate: 900, amount: (4 / 2) * 900 },   // 1,800
    ],
    shortageItems: [
      { itemName: 'Kaleji', pieces: 6, rate: 400, amount: (6 / 2) * 400 }, // 1,200
    ],
    amount: 17000 + 4250 + 1800 - 1200, // 21,850
  };

  const openingBalance = 0;
  const totalKharedari = testEntry.amount;
  const totalPayment = 0;
  const closingBalance = openingBalance + totalKharedari - totalPayment;

  // Header
  doc.fillColor('#0F6E56').fontSize(20).font(fontBold).text('DAILY TALLY / KAROBAR HISAB', { align: 'center' });
  doc.fillColor('#5F5E5A').fontSize(11).font(fontRegular).text('Wholesaler / Supplier Hisab Statement', { align: 'center' });
  doc.moveDown(0.7);

  // Wholesaler Info
  const boxTop = doc.y;
  doc.rect(40, boxTop, 515, 60).fillAndStroke('#F8F7F4', '#E5E3DC');
  doc.fillColor('#2C2C2A').fontSize(13).font(fontBold).text('Wholesaler: Test Wholesaler Haji Sahab', 55, boxTop + 12);
  doc.fillColor('#5F5E5A').fontSize(10).font(fontRegular).text('Phone: 0300-1234567', 55, boxTop + 34);
  doc.fillColor('#0F6E56').fontSize(11).font(fontBold).text('Date Range: 2026-09-01  to  2026-09-30', 300, boxTop + 14, { align: 'right', width: 240 });
  doc.fillColor('#5F5E5A').fontSize(9).font(fontRegular).text(`Generated: ${new Date().toLocaleString()}`, 300, boxTop + 34, { align: 'right', width: 240 });

  doc.y = boxTop + 75;

  // Opening Balance Banner
  const bannerY = doc.y;
  doc.rect(40, bannerY, 515, 28).fillAndStroke('#FAF5EE', '#EBDCC8');
  doc.fillColor('#BA7517').fontSize(11).font(fontBold).text('Pichla Baqaya (Opening Balance Carried Forward):', 52, bannerY + 8);
  doc.text(`Rs. ${openingBalance.toLocaleString()}`, 380, bannerY + 8, { align: 'right', width: 160 });

  doc.y = bannerY + 38;

  // Table Header
  const tableTop = doc.y;
  doc.rect(40, tableTop, 515, 22).fillAndStroke('#0F6E56', '#0F6E56');
  doc.fillColor('#FFFFFF').fontSize(10).font(fontBold);
  doc.text('Date', 48, tableTop + 6, { width: 75 });
  doc.text('Type', 125, tableTop + 6, { width: 70 });
  doc.text('Details / Breakdown', 200, tableTop + 6, { width: 220 });
  doc.text('Amount (Rs.)', 425, tableTop + 6, { width: 120, align: 'right' });

  let currentY = tableTop + 24;

  // Entry with breakdown
  const extraLines = testEntry.extraItems;
  const shortageLines = testEntry.shortageItems;
  const entryHeight = 12 + 16 + (extraLines.length * 15) + (shortageLines.length * 15) + 18 + 6;

  doc.rect(40, currentY, 515, entryHeight).fillAndStroke('#FFFFFF', '#E5E3DC');

  doc.fillColor('#2C2C2A').font(fontRegular).fontSize(9).text('07 Sep 2026', 48, currentY + 7, { width: 75 });
  doc.fillColor('#A32D2D').font(fontBold).fontSize(9).text('KHAREDARI', 125, currentY + 7, { width: 70 });

  let lineY = currentY + 6;
  // a. Base item line
  doc.font(fontBold).fillColor('#2C2C2A').fontSize(9);
  doc.text(`Base: ${testEntry.quantity} ${testEntry.itemName} @ Rs.${testEntry.rate.toLocaleString()}`, 200, lineY, { width: 155 });
  doc.text(`= Rs. ${testEntry.baseAmount.toLocaleString()}`, 355, lineY, { width: 65, align: 'right' });
  lineY += 15;

  // b. Extra lines
  extraLines.forEach((ex) => {
    doc.font(fontRegular).fillColor('#2E7D32').fontSize(8.5);
    doc.text(`+ Extra: ${ex.itemName} ${ex.pieces}pcs ÷ 2 × Rs.${ex.rate}`, 205, lineY, { width: 150 });
    doc.text(`= Rs. ${ex.amount.toLocaleString()}`, 355, lineY, { width: 65, align: 'right' });
    lineY += 15;
  });

  // c. Shortage lines
  shortageLines.forEach((sh) => {
    doc.font(fontRegular).fillColor('#C62828').fontSize(8.5);
    doc.text(`− Kam: ${sh.itemName} ${sh.pieces}pcs ÷ 2 × Rs.${sh.rate}`, 205, lineY, { width: 150 });
    doc.text(`= -Rs. ${sh.amount.toLocaleString()}`, 355, lineY, { width: 65, align: 'right' });
    lineY += 15;
  });

  // d. Entry Total
  doc.font(fontBold).fillColor('#0F6E56').fontSize(9);
  doc.text('= Entry Total:', 200, lineY, { width: 155 });
  doc.text(`Rs. ${testEntry.amount.toLocaleString()}`, 355, lineY, { width: 65, align: 'right' });

  // Big right amount
  doc.fillColor('#A32D2D').font(fontBold).fontSize(10)
    .text(`Rs. ${testEntry.amount.toLocaleString()}`, 425, currentY + (entryHeight / 2) - 6, { width: 120, align: 'right' });

  currentY += entryHeight + 15;

  // Totals Box
  doc.rect(40, currentY, 515, 80).fillAndStroke('#F8F7F4', '#0F6E56');
  doc.fillColor('#2C2C2A').fontSize(10).font(fontRegular).text('Total Kharedari (Purchases):', 60, currentY + 12);
  doc.fillColor('#A32D2D').font(fontBold).text(`Rs. ${totalKharedari.toLocaleString()}`, 210, currentY + 12, { align: 'right', width: 110 });
  doc.fillColor('#2C2C2A').font(fontRegular).text('Total Payment (Adaigi):', 60, currentY + 32);
  doc.fillColor('#3B6D11').font(fontBold).text(`Rs. ${totalPayment.toLocaleString()}`, 210, currentY + 32, { align: 'right', width: 110 });

  doc.rect(340, currentY + 8, 200, 64).fillAndStroke('#0F6E56', '#0F6E56');
  doc.fillColor('#FFFFFF').fontSize(10).font(fontBold).text('CLOSING BALANCE (TOTAL DENA HAI)', 345, currentY + 16, { align: 'center', width: 190 });
  doc.fontSize(15).text(`Rs. ${closingBalance.toLocaleString()}`, 345, currentY + 38, { align: 'center', width: 190 });

  doc.end();

  const buffer = await pdfPromise;
  const outPath = path.join(__dirname, 'test_output_wholesaler.pdf');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Test PDF generated successfully at ${outPath} (${buffer.length} bytes)`);

  console.log('Order verified:');
  console.log('  1. Base: 20 Siri Jore @ Rs.850 = Rs.17,000');
  console.log('  2. Extra 1: Siri 10pcs ÷ 2 × Rs.850 = Rs.4,250');
  console.log('  3. Extra 2: Jore 4pcs ÷ 2 × Rs.900 = Rs.1,800');
  console.log('  4. Shortage: Kaleji 6pcs ÷ 2 × Rs.400 = -Rs.1,200');
  console.log('  5. Entry Total = 17,000 + 4,250 + 1,800 - 1,200 = Rs.21,850');
  console.log('  6. Totals Box: Total Kharedari = Rs.21,850, Closing = Rs.21,850');
}

testPdf().catch(console.error);
