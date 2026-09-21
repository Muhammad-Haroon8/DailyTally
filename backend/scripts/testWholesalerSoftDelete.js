// scripts/testWholesalerSoftDelete.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const User = require('../models/User');

const BASE_URL = 'http://127.0.0.1:5000/api';

const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const config = { method: options.method || 'GET', headers };
  if (options.body) config.body = JSON.stringify(options.body);
  const response = await fetch(url, config);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: response.status, ok: response.ok, data };
};

const run = async () => {
  await connectDB();

  // Super Admin login
  const adminLogin = await apiRequest('/super-admin/login', {
    method: 'POST',
    body: { email: 'admin@dailytally.com', password: 'SuperSecret123' },
  });
  const adminToken = adminLogin.data.token;

  // Shop user
  const shopUser = await User.findOne({});
  const staffToken = jwt.sign({ userId: shopUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // Create wholesaler
  const createWholesalerRes = await apiRequest('/wholesalers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: { name: `Test Wholesaler ${Date.now()}`, phone: '03111222333' },
  });
  const wholesalerId = createWholesalerRes.data._id;
  console.log('Created wholesaler:', wholesalerId);

  // Soft delete wholesaler
  const deleteRes = await apiRequest(`/wholesalers/${wholesalerId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log('Wholesaler delete response:', deleteRes.data);

  // Check shop list (should NOT be present)
  const shopWholesalersRes = await apiRequest('/wholesalers', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const inShop = Array.isArray(shopWholesalersRes.data) && shopWholesalersRes.data.find(w => String(w._id) === String(wholesalerId));
  console.log('In shop view (should be false/undefined):', !!inShop);

  // Check super admin list (SHOULD be present with isDeleted: true)
  const adminWholesalersRes = await apiRequest(`/super-admin/shops/${shopUser._id}/wholesalers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const inAdmin = adminWholesalersRes.data.wholesalers?.find(w => String(w._id) === String(wholesalerId));
  console.log('In super admin view (should be true):', !!inAdmin, 'isDeleted:', inAdmin?.isDeleted);

  // Check audit log for wholesaler
  const auditRes = await apiRequest(`/super-admin/audit-log/${wholesalerId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('Audit log entries for wholesaler:', auditRes.data.length);

  if (!inShop && inAdmin && inAdmin.isDeleted && auditRes.data.length > 0) {
    console.log('✅ Wholesaler soft delete & audit passed!');
  } else {
    console.error('❌ Wholesaler verification failed!');
    process.exit(1);
  }
  process.exit(0);
};

run();
