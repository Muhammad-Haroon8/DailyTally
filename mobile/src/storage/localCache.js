// src/storage/localCache.js
// Local Cache layer for Customers, Customer Details (Entries/Months/Balances), and Items.
// Automatically calculates running balances and calendar month groupings matching the backend.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_CUSTOMERS = '@cache_customers';
const CACHE_KEY_ITEMS = '@cache_items';
const getCustomerDetailKey = (customerId) => `@cache_customer_${customerId}`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Recalculates month groupings, running balances, and overall customer balance
 * identically to the backend Mongoose aggregation / entryController logic.
 *
 * @param {Object} customer
 * @param {Array} rawEntries All entries for this customer
 * @returns {{ customer: Object, months: Array, entries: Array }}
 */
export const computeCustomerHisabFromEntries = (customer, rawEntries = []) => {
  // Sort entries chronologically (oldest to newest) to chain running balances
  const sortedChronological = [...rawEntries].sort((a, b) => {
    const timeA = new Date(a.entryDate || a.createdAt || 0).getTime();
    const timeB = new Date(b.entryDate || b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  const monthMap = new Map();
  let runningBalance = 0;

  sortedChronological.forEach((entry) => {
    const d = new Date(entry.entryDate || entry.createdAt);
    const year = d.getFullYear();
    const monthNum = d.getMonth();
    const monthKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        year,
        monthIndex: monthNum,
        monthLabel: `${MONTH_NAMES[monthNum]} ${year}`,
        entries: [],
        monthNet: 0,
      });
    }

    const monthGroup = monthMap.get(monthKey);
    monthGroup.entries.push(entry);

    if (entry.type === 'item') {
      monthGroup.monthNet += Number(entry.amount || 0);
    } else {
      monthGroup.monthNet -= Number(entry.amount || 0);
    }
  });

  // Sort months chronologically
  const chronologicalMonths = Array.from(monthMap.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  const processedMonths = chronologicalMonths.map((m) => {
    const openingBalance = Math.round(runningBalance * 100) / 100;
    const monthNet = Math.round(m.monthNet * 100) / 100;
    const closingBalance = Math.round((openingBalance + monthNet) * 100) / 100;

    // Update running balance for next month
    runningBalance = closingBalance;

    // Entries inside month sorted newest first
    const displayEntries = [...m.entries].reverse();

    return {
      monthKey: m.monthKey,
      monthLabel: m.monthLabel,
      openingBalance,
      monthNet,
      closingBalance,
      entries: displayEntries,
    };
  });

  // Overall customer net balance
  const finalBalance = Math.round(runningBalance * 100) / 100;

  // Months sorted newest month first for UI display
  const displayMonths = [...processedMonths].reverse();

  // All entries newest first
  const displayRawEntries = [...sortedChronological].reverse();

  return {
    customer: {
      ...customer,
      balance: finalBalance,
    },
    months: displayMonths,
    entries: displayRawEntries,
  };
};

/* ==========================================================================
   CUSTOMERS LIST CACHE
   ========================================================================== */

export const getCachedCustomers = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_CUSTOMERS);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error reading cached customers:', err);
    return null;
  }
};

export const saveCachedCustomers = async (customers) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY_CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.error('Error saving cached customers:', err);
  }
};

/**
 * Optimistically add or update a customer in cached customer list
 */
export const upsertCachedCustomer = async (customer) => {
  try {
    const current = (await getCachedCustomers()) || [];
    const idx = current.findIndex((c) => c._id === customer._id);
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...customer };
    } else {
      updated = [customer, ...current];
    }
    await saveCachedCustomers(updated);
    return updated;
  } catch (err) {
    console.error('Error upserting cached customer:', err);
  }
};

export const removeCachedCustomer = async (customerId) => {
  try {
    const current = (await getCachedCustomers()) || [];
    const updated = current.filter((c) => c._id !== customerId);
    await saveCachedCustomers(updated);
    await AsyncStorage.removeItem(getCustomerDetailKey(customerId));
    return updated;
  } catch (err) {
    console.error('Error removing cached customer:', err);
  }
};

/* ==========================================================================
   CUSTOMER DETAIL & HISAB CACHE (Entries, Months, Balance)
   ========================================================================== */

export const getCachedCustomerDetail = async (customerId) => {
  try {
    const raw = await AsyncStorage.getItem(getCustomerDetailKey(customerId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`Error reading cached detail for customer ${customerId}:`, err);
    return null;
  }
};

export const saveCachedCustomerDetail = async (customerId, data) => {
  try {
    await AsyncStorage.setItem(getCustomerDetailKey(customerId), JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving cached detail for customer ${customerId}:`, err);
  }
};

/**
 * Optimistically add an entry to a customer's cached record and update balance
 */
export const addOptimisticEntry = async (customerId, entry) => {
  try {
    let detail = await getCachedCustomerDetail(customerId);
    let currentRawEntries = detail?.entries || [];

    // Append entry
    const updatedEntries = [...currentRawEntries, entry];

    // Read customer object
    let customerObj = detail?.customer;
    if (!customerObj) {
      const allCustomers = (await getCachedCustomers()) || [];
      customerObj = allCustomers.find((c) => c._id === customerId) || { _id: customerId, name: 'Gahak' };
    }

    // Recompute hisab
    const recomputed = computeCustomerHisabFromEntries(customerObj, updatedEntries);

    // Save detail cache
    await saveCachedCustomerDetail(customerId, recomputed);

    // Update customer in master customers list cache as well
    await upsertCachedCustomer({
      ...customerObj,
      balance: recomputed.customer.balance,
      updatedAt: new Date().toISOString(),
    });

    return recomputed;
  } catch (err) {
    console.error('Error adding optimistic entry to cache:', err);
  }
};

/**
 * Optimistically update an existing entry in customer's cached record
 */
export const updateOptimisticEntry = async (customerId, entryId, updatedFields) => {
  try {
    const detail = await getCachedCustomerDetail(customerId);
    if (!detail) return null;

    const currentEntries = detail.entries || [];
    const idx = currentEntries.findIndex((e) => e._id === entryId);
    if (idx === -1) return detail;

    const updatedList = [...currentEntries];
    updatedList[idx] = { ...updatedList[idx], ...updatedFields };

    const recomputed = computeCustomerHisabFromEntries(detail.customer, updatedList);
    await saveCachedCustomerDetail(customerId, recomputed);

    await upsertCachedCustomer({
      ...detail.customer,
      balance: recomputed.customer.balance,
    });

    return recomputed;
  } catch (err) {
    console.error('Error updating optimistic entry in cache:', err);
  }
};

/**
 * Optimistically delete an entry in customer's cached record
 */
export const deleteOptimisticEntry = async (customerId, entryId) => {
  try {
    const detail = await getCachedCustomerDetail(customerId);
    if (!detail) return null;

    const currentEntries = detail.entries || [];
    const updatedList = currentEntries.filter((e) => e._id !== entryId);

    const recomputed = computeCustomerHisabFromEntries(detail.customer, updatedList);
    await saveCachedCustomerDetail(customerId, recomputed);

    await upsertCachedCustomer({
      ...detail.customer,
      balance: recomputed.customer.balance,
    });

    return recomputed;
  } catch (err) {
    console.error('Error deleting optimistic entry from cache:', err);
  }
};

/* ==========================================================================
   ITEMS MASTER CACHE
   ========================================================================== */

export const getCachedItems = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_ITEMS);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error reading cached items:', err);
    return null;
  }
};

export const saveCachedItems = async (items) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving cached items:', err);
  }
};

export const upsertCachedItem = async (item) => {
  try {
    const current = (await getCachedItems()) || [];
    const idx = current.findIndex((i) => i._id === item._id);
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...item };
    } else {
      updated = [item, ...current];
    }
    await saveCachedItems(updated);
    return updated;
  } catch (err) {
    console.error('Error upserting cached item:', err);
  }
};

export const removeCachedItem = async (itemId) => {
  try {
    const current = (await getCachedItems()) || [];
    const updated = current.filter((i) => i._id !== itemId);
    await saveCachedItems(updated);
    return updated;
  } catch (err) {
    console.error('Error removing cached item:', err);
  }
};

/* ==========================================================================
   ID REMAPPING ACROSS ALL LOCAL CACHES
   ========================================================================== */

/**
 * Replaces a temporary local ID with the real MongoDB server ID across:
 * - The customers list cache
 * - The customer detail cache key & content
 * - Any entries referencing this ID
 */
export const replaceEntityIdInCache = async (tempId, realId) => {
  if (!tempId || !realId) return;

  try {
    // 1. Update Customers list
    const customers = await getCachedCustomers();
    if (customers && customers.length > 0) {
      let updated = false;
      const newCustomers = customers.map((c) => {
        if (c._id === tempId) {
          updated = true;
          return { ...c, _id: realId, isLocal: false };
        }
        return c;
      });
      if (updated) {
        await saveCachedCustomers(newCustomers);
      }
    }

    // 2. Check if there was a customer detail cache under @cache_customer_<tempId>
    const tempDetail = await getCachedCustomerDetail(tempId);
    if (tempDetail) {
      const updatedDetail = {
        ...tempDetail,
        customer: {
          ...tempDetail.customer,
          _id: realId,
          isLocal: false,
        },
      };
      // Save under new key and remove old
      await saveCachedCustomerDetail(realId, updatedDetail);
      await AsyncStorage.removeItem(getCustomerDetailKey(tempId));
    }

    // 3. Update Master items list if tempId belongs to an item
    const items = await getCachedItems();
    if (items && items.length > 0) {
      let updated = false;
      const newItems = items.map((item) => {
        if (item._id === tempId) {
          updated = true;
          return { ...item, _id: realId, isLocal: false };
        }
        return item;
      });
      if (updated) {
        await saveCachedItems(newItems);
      }
    }

    console.log(`🔄 [LocalCache] Replaced entity ID: ${tempId} -> ${realId}`);
  } catch (err) {
    console.error(`Error replacing entity ID in cache (${tempId} -> ${realId}):`, err);
  }
};
