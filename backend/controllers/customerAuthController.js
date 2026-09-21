// controllers/customerAuthController.js
// Customer-facing authentication (Phone-only login without password/OTP)
// Generates customer-scoped JWT tokens with tokenType: "customer"

const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const User = require('../models/User');

// In-memory sliding window rate limiter per IP address
// Window: 60,000ms (1 minute), Max attempts: 5
const ipAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipAttempts.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS * 2) {
      ipAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Normalizes phone number to core digits for robust matching across Pakistani formats:
 * e.g. "03001234567", "+923001234567", "923001234567", "0300-1234567", "0300 1234567"
 * @param {string} phone
 * @returns {string} 10-digit national number (e.g. "3001234567") or cleaned digits
 */
const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('92')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

/**
 * Rate limit check for customer login endpoint
 * @param {string} ip
 * @returns {boolean} true if allowed, false if limit exceeded
 */
const checkRateLimit = (ip) => {
  const now = Date.now();
  const record = ipAttempts.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    ipAttempts.set(ip, { count: 1, startTime: now });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
};

/**
 * Customer Phone Login
 * POST /api/customer-auth/login
 * Body: { phone: string, customerId?: string }
 */
const customerLogin = async (req, res) => {
  try {
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    // 1. Check Rate Limit
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Bohat zyada koshishein. Barah-e-karam 1 minute intezar karein (Rate limit exceeded).',
      });
    }

    const { phone, customerId } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number likhna lazmi hai' });
    }

    const normalizedInput = normalizePhone(phone);
    if (!normalizedInput || normalizedInput.length < 7) {
      return res.status(400).json({ error: 'Durust phone number darj karein (kam az kam 7 digits)' });
    }

    // 2. If a specific customerId was provided (disambiguation response from mobile app)
    if (customerId) {
      const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } }).populate('userId', 'name phone');
      if (!customer) {
        return res.status(404).json({ error: 'Ye customer record dastiyab nahi hai' });
      }

      const customerNormalizedPhone = normalizePhone(customer.phone);
      if (customerNormalizedPhone !== normalizedInput) {
        return res.status(400).json({ error: 'Phone number customer record se match nahi karta' });
      }

      return issueCustomerToken(customer, res);
    }

    // 3. Search Customer records
    // Create flexible regex using last 7 digits to query database efficiently
    const last7 = normalizedInput.slice(-7);
    const regexPattern = last7.split('').join('[\\s-]*') + '$';
    const regex = new RegExp(regexPattern);

    const candidates = await Customer.find({
      phone: { $regex: regex },
      isDeleted: { $ne: true },
    }).populate('userId', 'name phone');

    // Filter candidates by exact normalized match
    const exactMatches = candidates.filter(
      (c) => normalizePhone(c.phone) === normalizedInput
    );

    // 4. Handle 0 Matches
    if (exactMatches.length === 0) {
      return res.status(404).json({
        error: 'Ye number kisi gahak ke record se match nahi hua. Dukan dar se apna number confirm karein.',
      });
    }

    // 5. Handle Multiple Matches (same phone used across multiple shops)
    if (exactMatches.length > 1) {
      const matches = exactMatches.map((c) => ({
        customerId: c._id,
        name: c.name,
        shopName: c.userId?.name || 'Karobar Hisab Shop',
        shopPhone: c.userId?.phone || '',
      }));

      return res.status(200).json({
        multiple: true,
        message: 'Multiple shops found for this phone number. Please select your shop.',
        matches,
      });
    }

    // 6. Exactly One Match
    const matchedCustomer = exactMatches[0];
    return issueCustomerToken(matchedCustomer, res);
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json({ error: 'Server error during customer login' });
  }
};

/**
 * Issues customer-scoped JWT token and returns user profile
 */
const issueCustomerToken = (customer, res) => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const shopId = customer.userId?._id || customer.userId;
  const shopName = customer.userId?.name || 'Karobar Hisab Shop';

  const token = jwt.sign(
    {
      customerId: customer._id.toString(),
      shopId: shopId ? shopId.toString() : null,
      tokenType: 'customer',
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.status(200).json({
    token,
    customer: {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
    },
    shopName,
  });
};

module.exports = {
  customerLogin,
  normalizePhone,
};
