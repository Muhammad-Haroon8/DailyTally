// scripts/testSuperAdminScenario.js
// Automated verification of the exact Super Admin scenario using native fetch

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const User = require('../models/User');

const BASE_URL = 'http://127.0.0.1:5000/api';

const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const config = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, config);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: response.status, ok: response.ok, data };
};

const runTest = async () => {
  console.log('=====================================================');
  console.log('🧪 STARTING SUPER ADMIN & SOFT-DELETE SCENARIO TEST');
  console.log('=====================================================\n');

  try {
    await connectDB();

    // 1. Log in as Super Admin
    console.log('Step 1: Logging in as Super Admin via POST /api/super-admin/login...');
    const superAdminLoginRes = await apiRequest('/super-admin/login', {
      method: 'POST',
      body: {
        email: 'admin@dailytally.com',
        password: 'SuperSecret123',
      },
    });

    if (superAdminLoginRes.status !== 200) {
      throw new Error(`Super Admin login failed: ${JSON.stringify(superAdminLoginRes.data)}`);
    }

    const superAdminToken = superAdminLoginRes.data.token;
    console.log('✅ Super Admin login succeeded! Token received.');

    // Verify token shape
    const decodedSuperAdmin = jwt.decode(superAdminToken);
    console.log('Token payload:', decodedSuperAdmin);
    if (decodedSuperAdmin.tokenType !== 'superadmin' || !decodedSuperAdmin.superAdminId) {
      throw new Error('Super Admin token payload shape is invalid!');
    }
    console.log('✅ Token payload has tokenType: "superadmin" and superAdminId.\n');

    // 2. Find or create a shop user (Haroon)
    console.log('Step 2: Locating shop owner user (Haroon)...');
    let shopUser = await User.findOne({ email: /haroon/i });
    if (!shopUser) {
      shopUser = await User.findOne({});
    }
    if (!shopUser) {
      throw new Error('No shop user found in database!');
    }
    console.log(`Found shop user: ${shopUser.name} (${shopUser.email}), ID: ${shopUser._id}`);

    const staffToken = jwt.sign({ userId: shopUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('Issued temporary staff token for shop owner.\n');

    // 3. Create a test customer under this shop
    console.log('Step 3: Creating a test customer as shop user...');
    const testCustomerName = `Audit Test Customer ${Date.now()}`;
    const createCustomerRes = await apiRequest('/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { name: testCustomerName, phone: '03001234567' },
    });
    if (createCustomerRes.status !== 201) {
      throw new Error(`Failed to create customer: ${JSON.stringify(createCustomerRes.data)}`);
    }
    const testCustomerId = createCustomerRes.data._id || createCustomerRes.data.id;
    console.log(`✅ Test customer created: "${testCustomerName}" (ID: ${testCustomerId})\n`);

    // 4. Soft-delete the customer as normal shop user
    console.log(`Step 4: Soft-deleting customer (DELETE /api/customers/${testCustomerId})...`);
    const deleteRes = await apiRequest(`/customers/${testCustomerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    console.log(`Delete response:`, deleteRes.data);
    if (deleteRes.status !== 200) {
      throw new Error(`Failed to delete customer: ${JSON.stringify(deleteRes.data)}`);
    }
    console.log('✅ Customer delete request succeeded.\n');

    // 5. Confirm customer disappears from Haroon's normal customer list
    console.log('Step 5: Verifying customer is hidden from normal shop list (GET /api/customers)...');
    const shopCustomersRes = await apiRequest('/customers', {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const foundInShop = Array.isArray(shopCustomersRes.data) && shopCustomersRes.data.find((c) => String(c._id) === String(testCustomerId));
    if (foundInShop) {
      throw new Error('FAILED: Soft-deleted customer STILL appeared in shop customer list!');
    }
    console.log('✅ Confirmed: Customer is hidden from normal shop view.\n');

    // 6. As Super Admin, call GET /api/super-admin/shops/:shopId/customers
    console.log(`Step 6: Fetching shop customers as Super Admin (GET /api/super-admin/shops/${shopUser._id}/customers)...`);
    const superAdminShopCustomersRes = await apiRequest(`/super-admin/shops/${shopUser._id}/customers`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    if (superAdminShopCustomersRes.status !== 200) {
      throw new Error(`Failed to fetch shop customers as super admin: ${JSON.stringify(superAdminShopCustomersRes.data)}`);
    }

    const deletedCustomerInAdmin = superAdminShopCustomersRes.data.customers?.find(
      (c) => String(c._id) === String(testCustomerId)
    );

    if (!deletedCustomerInAdmin) {
      throw new Error('FAILED: Deleted customer NOT found in Super Admin customer list!');
    }
    if (!deletedCustomerInAdmin.isDeleted) {
      throw new Error('FAILED: Customer is not marked isDeleted: true in Super Admin list!');
    }
    if (!deletedCustomerInAdmin.deletedAt) {
      throw new Error('FAILED: Customer deletedAt timestamp is missing in Super Admin list!');
    }
    console.log('✅ Confirmed: Deleted customer STILL appears for Super Admin:');
    console.log(`   - Name: ${deletedCustomerInAdmin.name}`);
    console.log(`   - isDeleted: ${deletedCustomerInAdmin.isDeleted}`);
    console.log(`   - deletedAt: ${deletedCustomerInAdmin.deletedAt}`);
    console.log(`   - deletedBy: ${deletedCustomerInAdmin.deletedBy}\n`);

    // 7. Check AuditLog as Super Admin (GET /api/super-admin/audit-log)
    console.log('Step 7: Checking AuditLog entries (GET /api/super-admin/audit-log)...');
    const auditLogRes = await apiRequest(`/super-admin/audit-log?shopId=${shopUser._id}&entityType=Customer`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    if (auditLogRes.status !== 200) {
      throw new Error(`Failed to fetch audit log: ${JSON.stringify(auditLogRes.data)}`);
    }

    const matchingAuditLog = auditLogRes.data.logs?.find(
      (log) => String(log.entityId) === String(testCustomerId)
    );

    if (!matchingAuditLog) {
      throw new Error('FAILED: No AuditLog entry found for deleted customer!');
    }
    console.log('✅ Confirmed: AuditLog entry exists with full snapshot:');
    console.log(`   - Performed By: ${matchingAuditLog.performedByUserName} (ID: ${matchingAuditLog.performedByUserId?._id || matchingAuditLog.performedByUserId})`);
    console.log(`   - Action: ${matchingAuditLog.action}`);
    console.log(`   - Entity Type: ${matchingAuditLog.entityType}`);
    console.log(`   - Timestamp: ${matchingAuditLog.timestamp}`);
    console.log(`   - Snapshot Customer Name: ${matchingAuditLog.entitySnapshot?.name}\n`);

    // 8. Test Single Entity Audit History (GET /api/super-admin/audit-log/:entityId)
    console.log(`Step 8: Testing single entity audit history (GET /api/super-admin/audit-log/${testCustomerId})...`);
    const entityAuditRes = await apiRequest(`/super-admin/audit-log/${testCustomerId}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (!Array.isArray(entityAuditRes.data) || entityAuditRes.data.length === 0) {
      throw new Error('FAILED: Entity audit history returned empty!');
    }
    console.log(`✅ Single entity audit history verified (${entityAuditRes.data.length} records).\n`);

    // 9. Test Security Boundaries (403 Rejections)
    console.log('Step 9: Testing Security Boundaries & Mutual Token Exclusivity...');

    // 9a. Staff token calling Super Admin endpoint -> expect 403
    const staffOnAdminRes = await apiRequest('/super-admin/shops', {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (staffOnAdminRes.status === 403) {
      console.log('✅ Staff token blocked with 403 from Super Admin endpoint.');
    } else {
      throw new Error(`FAILED: Staff token on super admin returned ${staffOnAdminRes.status}, expected 403`);
    }

    // 9b. Customer portal token calling Super Admin endpoint -> expect 403
    const customerToken = jwt.sign(
      { customerId: testCustomerId, shopId: shopUser._id, tokenType: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const customerOnAdminRes = await apiRequest('/super-admin/shops', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (customerOnAdminRes.status === 403) {
      console.log('✅ Customer portal token blocked with 403 from Super Admin endpoint.');
    } else {
      throw new Error(`FAILED: Customer token on super admin returned ${customerOnAdminRes.status}, expected 403`);
    }

    // 9c. Super Admin token calling staff endpoint -> expect 403
    const adminOnStaffRes = await apiRequest('/customers', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (adminOnStaffRes.status === 403) {
      console.log('✅ Super Admin token blocked with 403 from Staff endpoint.');
    } else {
      throw new Error(`FAILED: Super Admin token on staff endpoint returned ${adminOnStaffRes.status}, expected 403`);
    }

    // 10. Super Admin Shops Overview
    console.log('\nStep 10: Testing GET /api/super-admin/shops...');
    const shopsRes = await apiRequest('/super-admin/shops', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (shopsRes.status !== 200) {
      throw new Error(`Failed to fetch shops: ${JSON.stringify(shopsRes.data)}`);
    }
    console.log(`✅ Fetched ${shopsRes.data.length} shop(s).`);
    console.log('Sample shop summary:', JSON.stringify(shopsRes.data[0], null, 2));

    console.log('\n=====================================================');
    console.log('🎉 ALL DELIVERABLE SCENARIOS PASSED WITH 100% SUCCESS!');
    console.log('=====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ SCENARIO TEST FAILED:', error.message);
    process.exit(1);
  }
};

runTest();
