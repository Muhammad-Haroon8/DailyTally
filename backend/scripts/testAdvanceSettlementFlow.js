// backend/scripts/testAdvanceSettlementFlow.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Wholesaler = require('../models/Wholesaler');
const WholesalerEntry = require('../models/WholesalerEntry');
const wholesalerController = require('../controllers/wholesalerController');
const wholesalerEntryController = require('../controllers/wholesalerEntryController');
const { generateReportPdf } = require('../services/pdfReportService');

async function testAdvanceSettlementScenario() {
  console.log('🧪 Starting Advance Settlement Flow Test...');
  await mongoose.connect(process.env.MONGODB_URI);

  const wholesaler = await Wholesaler.findOne();
  if (!wholesaler) {
    console.error('No wholesaler found');
    process.exit(1);
  }

  console.log(`👤 Using Wholesaler: ${wholesaler.name} (${wholesaler._id})`);

  // 1. Fetch current balance before creating anything
  const reqMock = {
    userId: wholesaler.userId,
    params: { wholesalerId: wholesaler._id, id: wholesaler._id },
    query: {},
  };

  let wholesalerData = null;
  const resMockWholesaler = {
    status: () => ({
      json: (data) => { wholesalerData = data; },
    }),
  };

  await wholesalerController.getWholesalerById(reqMock, resMockWholesaler);
  console.log('Initial Wholesaler State:', {
    totalKharedari: wholesalerData.totalKharedari,
    totalPayment: wholesalerData.totalPayment,
    totalAdvance: wholesalerData.totalAdvance,
    totalAdvanceSettlement: wholesalerData.totalAdvanceSettlement,
    advanceBaqi: wholesalerData.advanceBaqi,
    baqiBaqaya: wholesalerData.baqiBaqaya,
  });

  // 2. Test Advance Settlement Creation with Validation
  // Try to settle more than available -> must reject
  const excessAmount = (wholesalerData.advanceBaqi || 0) + 999999999;
  let rejectedError = null;
  const resMockReject = {
    status: (code) => ({
      json: (data) => { rejectedError = { code, data }; },
    }),
  };

  await wholesalerEntryController.createWholesalerEntry(
    {
      userId: wholesaler.userId,
      body: {
        wholesalerId: wholesaler._id,
        type: 'advanceSettlement',
        amount: excessAmount,
      },
    },
    resMockReject
  );

  if (rejectedError && rejectedError.code === 400) {
    console.log('✅ Excess advance settlement correctly rejected server-side:', rejectedError.data.error);
  } else {
    throw new Error('Excess settlement was not rejected as expected!');
  }

  // 3. Perform a valid advanceSettlement of Rs. 21,850 (matching the purchase from earlier)
  let settlementResult = null;
  const resMockSuccess = {
    status: (code) => ({
      json: (data) => { settlementResult = { code, data }; },
    }),
  };

  const settleAmount = 21850;
  await wholesalerEntryController.createWholesalerEntry(
    {
      userId: wholesaler.userId,
      body: {
        wholesalerId: wholesaler._id,
        type: 'advanceSettlement',
        amount: settleAmount,
        note: 'Advance Se Adjust Kiya',
        entryDate: new Date('2026-09-07T12:00:00.000Z'),
        entryTime: '12:00 PM',
      },
    },
    resMockSuccess
  );

  console.log('✅ Created advanceSettlement entry of Rs.', settleAmount);
  console.log('Returned from create:', {
    balance: settlementResult.data.balance,
    advanceBaqi: settlementResult.data.advanceBaqi,
  });

  // 4. Verify updated wholesaler calculations
  await wholesalerController.getWholesalerById(reqMock, resMockWholesaler);
  console.log('Updated Wholesaler State after settlement:', {
    totalKharedari: wholesalerData.totalKharedari,
    totalPayment: wholesalerData.totalPayment,
    totalAdvance: wholesalerData.totalAdvance,
    totalAdvanceSettlement: wholesalerData.totalAdvanceSettlement,
    advanceBaqi: wholesalerData.advanceBaqi,
    baqiBaqaya: wholesalerData.baqiBaqaya,
  });

  // Verify formula: baqiBaqaya = totalKharedari - totalPayment
  if (wholesalerData.baqiBaqaya !== wholesalerData.totalKharedari - wholesalerData.totalPayment) {
    throw new Error(`Formula mismatch: baqiBaqaya (${wholesalerData.baqiBaqaya}) !== kharedari (${wholesalerData.totalKharedari}) - payment (${wholesalerData.totalPayment})`);
  }
  console.log('✅ Verified Baqi Baqaya formula: Kharedari - Payment');

  // Verify advanceBaqi = totalAdvance - totalAdvanceSettlement
  if (wholesalerData.advanceBaqi !== wholesalerData.totalAdvance - wholesalerData.totalAdvanceSettlement) {
    throw new Error(`Formula mismatch: advanceBaqi (${wholesalerData.advanceBaqi}) !== advance (${wholesalerData.totalAdvance}) - settlement (${wholesalerData.totalAdvanceSettlement})`);
  }
  console.log('✅ Verified Advance Pool formula: Total Advance - Total Advance Settled');

  // 5. Test PDF report generation for September 2026
  let pdfResult = null;
  const resMockPdf = {
    headers: {},
    setHeader: function(k, v) { this.headers[k] = v; },
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    send: function(buffer) {
      pdfResult = buffer;
      return this;
    },
  };

  const reportController = require('../controllers/wholesalerReportController');
  await reportController.generateWholesalerReportPdf(
    {
      userId: wholesaler.userId,
      params: { wholesalerId: wholesaler._id },
      query: { startDate: '2026-09-01', endDate: '2026-09-30' },
    },
    resMockPdf
  );

  if (pdfResult && pdfResult.slice(0, 4).toString() === '%PDF') {
    console.log(`✅ PDF report generated successfully! Buffer size: ${pdfResult.length} bytes`);
  } else {
    throw new Error('PDF report generation failed or invalid buffer');
  }

  console.log('🎉 All advance settlement scenario tests passed cleanly!');
  process.exit(0);
}

testAdvanceSettlementScenario().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
