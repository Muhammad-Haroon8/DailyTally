// backend/scripts/testSharedPdfService.js
const fs = require('fs');
const path = require('path');
const { generateReportPdf } = require('../services/pdfReportService');

async function testPdfGeneration() {
  console.log('🧪 Testing Shared PDF Report Service...');

  // 1. Wholesaler scenario with multi-item adjustments and advance
  const wholesalerData = {
    shopName: 'Karobar Hisab - Meat Shop',
    entityLabel: 'Wholesaler',
    entityName: 'Malik Traders',
    entityPhone: '03001234567',
    dateRangeLabel: '2026-08-01  to  2026-09-30',
    openingBalance: 1000,
    lines: [
      {
        date: '2026-08-26',
        type: 'debit',
        typeBadgeText: 'KHAREDARI',
        mainLabel: '20 Siri Jore @ Rs.850',
        mainAmount: 17000,
        subLines: [
          { label: '+ Extra: Siri 10pcs ÷ 2 × Rs.850', amount: 4250 },
          { label: '+ Extra: Jore 4pcs ÷ 2 × Rs.900', amount: 1800 },
          { label: '− Kam: Kaleji 6pcs ÷ 2 × Rs.400', amount: -1200 },
        ],
        lineTotal: 21850,
      },
      {
        date: '2026-09-07',
        type: 'credit',
        typeBadgeText: 'ADVANCE',
        mainLabel: 'Advance Diya (Advance for upcoming stock)',
        mainAmount: 5000000,
        subLines: [],
        lineTotal: 5000000,
        note: 'Advance payment',
        entryTime: '02:30 PM',
      },
      {
        date: '2026-09-07',
        type: 'credit',
        typeBadgeText: 'PAYMENT',
        mainLabel: 'Payment (Bank Transfer)',
        mainAmount: 2000,
        subLines: [],
        lineTotal: 2000,
        note: 'Bank transfer',
        entryTime: '03:00 PM',
      }
    ],
    totals: {
      totalDebit: 21850,
      totalCredit: 2000,
      totalAdvance: 5000000,
      closingBalance: 1000 + 21850 - 2000 - 5000000, // -4979150
    },
  };

  const wholesalerPdfBuffer = await generateReportPdf(wholesalerData);
  console.log(`✅ Wholesaler PDF generated successfully. Buffer size: ${wholesalerPdfBuffer.length} bytes`);

  // 2. Customer scenario
  const customerData = {
    shopName: 'Karobar Hisab - Meat Shop',
    entityLabel: 'Customer',
    entityName: 'Ali Khan',
    entityPhone: '03123456789',
    dateRangeLabel: '2026-09-01  to  2026-09-30',
    openingBalance: 500,
    lines: [
      {
        date: '2026-09-02',
        type: 'debit',
        typeBadgeText: 'UDHAAR',
        mainLabel: 'Beef Boneless (5 x Rs.900)',
        mainAmount: 4500,
        subLines: [],
        lineTotal: 4500,
      },
      {
        date: '2026-09-05',
        type: 'credit',
        typeBadgeText: 'WASOOL',
        mainLabel: 'Wasool Raqam (Cash received)',
        mainAmount: 3000,
        subLines: [],
        lineTotal: 3000,
        note: 'Cash received',
      }
    ],
    totals: {
      totalDebit: 4500,
      totalCredit: 3000,
      closingBalance: 500 + 4500 - 3000, // 2000
    },
  };

  const customerPdfBuffer = await generateReportPdf(customerData);
  console.log(`✅ Customer PDF generated successfully. Buffer size: ${customerPdfBuffer.length} bytes`);

  // Verify non-empty and starts with %PDF
  if (wholesalerPdfBuffer.slice(0, 4).toString() === '%PDF' && customerPdfBuffer.slice(0, 4).toString() === '%PDF') {
    console.log('🎉 Both PDFs are valid PDF binary streams!');
  } else {
    throw new Error('PDF header validation failed');
  }
}

testPdfGeneration().catch((err) => {
  console.error('❌ Error during test:', err);
  process.exit(1);
});
