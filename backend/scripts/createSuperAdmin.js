// scripts/createSuperAdmin.js
// One-time CLI script to create the initial Super Admin account
// Usage: node backend/scripts/createSuperAdmin.js "<name>" "<email>" "<password>"
// Example: node backend/scripts/createSuperAdmin.js "Platform Admin" "admin@dailytally.com" "SuperSecret123"

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const SuperAdmin = require('../models/SuperAdmin');

const run = async () => {
  const args = process.argv.slice(2);
  const name = args[0];
  const email = args[1];
  const password = args[2];

  if (!name || !email || !password) {
    console.error('❌ Error: Missing required arguments.');
    console.log('\nUsage:');
    console.log('  node backend/scripts/createSuperAdmin.js "<name>" "<email>" "<password>"');
    console.log('\nExample:');
    console.log('  node backend/scripts/createSuperAdmin.js "Platform Admin" "admin@dailytally.com" "SuperSecret123"\n');
    process.exit(1);
  }

  const trimmedEmail = email.trim().toLowerCase();

  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    // Check if Super Admin already exists
    const existing = await SuperAdmin.findOne({ email: trimmedEmail });
    if (existing) {
      console.log(`⚠️  Super Admin with email "${trimmedEmail}" already exists!`);
      console.log(`ID: ${existing._id}`);
      console.log(`Name: ${existing.name}`);
      console.log(`Created At: ${existing.createdAt}`);
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create Super Admin record
    const superAdmin = await SuperAdmin.create({
      name: name.trim(),
      email: trimmedEmail,
      passwordHash,
    });

    console.log('\n✅ Super Admin account created successfully!');
    console.log('---------------------------------------------');
    console.log(`ID:         ${superAdmin._id}`);
    console.log(`Name:       ${superAdmin.name}`);
    console.log(`Email:      ${superAdmin.email}`);
    console.log(`Created At: ${superAdmin.createdAt}`);
    console.log('---------------------------------------------\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create Super Admin:', error);
    process.exit(1);
  }
};

run();
