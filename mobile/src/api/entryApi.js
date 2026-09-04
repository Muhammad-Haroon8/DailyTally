// src/api/entryApi.js
// Entry API client functions for Udhaar (item credit) and Wasool (payment collection)
// with complete offline optimistic calculation and queueing support.

import apiClient from './client';
import NetInfo from '@react-native-community/netinfo';
import {
  getCachedCustomerDetail,
  saveCachedCustomerDetail,
  addOptimisticEntry,
  updateOptimisticEntry,
  deleteOptimisticEntry,
} from '../storage/localCache';
import { addToQueue, generateLocalId } from '../storage/offlineQueue';

const checkIsOnline = async () => {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
};

/**
 * Creates an entry (item credit or payment).
 * If online: calls backend and updates local cache with authoritative result.
 * If offline: calculates amount, updates local cache with optimistic balance and month groupings,
 * and adds action to offline queue.
 *
 * @param {Object} payload { customerId, type, itemId, itemName, quantity, rate, amount, note, entryDate, entryTime }
 * @returns {Promise<{ entry: Object, balance: number }>}
 */
export const createEntry = async (payload) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.post('/entries', payload);
      // Immediately refresh/save the new authoritative balance in cache
      if (payload.customerId && response.data?.entry) {
        await addOptimisticEntry(payload.customerId, response.data.entry);
      }
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('createEntry online failed, saving offline:', error.message);
    }
  }

  // Calculate amount client-side matching backend
  let calculatedAmount = 0;
  if (payload.type === 'item') {
    calculatedAmount = Math.round(Number(payload.quantity || 0) * Number(payload.rate || 0) * 100) / 100;
  } else {
    calculatedAmount = Math.round(Number(payload.amount || 0) * 100) / 100;
  }

  const tempId = generateLocalId('entry');
  const localEntry = {
    _id: tempId,
    customerId: payload.customerId,
    type: payload.type,
    itemId: payload.itemId,
    itemName: payload.itemName,
    quantity: payload.type === 'item' ? Number(payload.quantity) : undefined,
    rate: payload.type === 'item' ? Number(payload.rate) : undefined,
    amount: calculatedAmount,
    note: payload.note ? payload.note.trim() : '',
    entryDate: payload.entryDate || new Date().toISOString(),
    entryTime: payload.entryTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString(),
    isLocal: true,
  };

  // Optimistically update cached customer detail & customer balance
  const recomputed = await addOptimisticEntry(payload.customerId, localEntry);

  // Queue action for syncing when online
  await addToQueue({
    type: 'createEntry',
    tempId,
    payload: {
      customerId: payload.customerId,
      type: payload.type,
      itemId: payload.itemId,
      itemName: payload.itemName,
      quantity: payload.quantity,
      rate: payload.rate,
      amount: payload.amount,
      note: payload.note,
      entryDate: payload.entryDate,
      entryTime: payload.entryTime,
    },
  });

  return {
    entry: localEntry,
    balance: recomputed?.customer?.balance || 0,
  };
};

/**
 * Fetches entries grouped by month, raw entries, and current balance for a customer.
 * Caches results on success. Falls back to cached data if offline.
 *
 * @param {string} customerId
 * @returns {Promise<{ customer: Object, months: Array, entries: Array }>}
 */
export const getEntriesByCustomer = async (customerId) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get(`/customers/${customerId}/entries`);
      await saveCachedCustomerDetail(customerId, response.data);
      return response.data;
    } catch (error) {
      console.warn(`Online getEntriesByCustomer failed for ${customerId}, falling back to cache:`, error.message);
    }
  }

  // Fallback to local cache
  const cached = await getCachedCustomerDetail(customerId);
  if (cached) {
    return {
      ...cached,
      isFromCache: true,
    };
  }

  throw new Error('Internet nahi hai aur is gahak ka purana hisab cached nahi hai.');
};

/**
 * Updates an existing entry
 * @param {string} id
 * @param {Object} payload
 * @returns {Promise<{ entry: Object, balance: number }>}
 */
export const updateEntry = async (id, payload) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.put(`/entries/${id}`, payload);
      if (payload.customerId && response.data?.entry) {
        await updateOptimisticEntry(payload.customerId, id, response.data.entry);
      }
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('updateEntry online failed, updating locally:', error.message);
    }
  }

  let calculatedAmount = payload.amount;
  if (payload.type === 'item' && payload.quantity !== undefined && payload.rate !== undefined) {
    calculatedAmount = Math.round(Number(payload.quantity) * Number(payload.rate) * 100) / 100;
  }

  const updatedFields = {
    ...payload,
    amount: calculatedAmount,
  };

  const recomputed = await updateOptimisticEntry(payload.customerId, id, updatedFields);

  await addToQueue({
    type: 'updateEntry',
    payload: { id, ...payload },
  });

  return {
    entry: { _id: id, ...updatedFields },
    balance: recomputed?.customer?.balance || 0,
  };
};

/**
 * Deletes an entry
 * @param {string} id
 * @param {string} [customerId]
 * @returns {Promise<{ message: string, balance: number }>}
 */
export const deleteEntry = async (id, customerId) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.delete(`/entries/${id}`);
      if (customerId) {
        await deleteOptimisticEntry(customerId, id);
      }
      return response.data;
    } catch (error) {
      console.warn('deleteEntry online failed, deleting locally:', error.message);
    }
  }

  let recomputed = null;
  if (customerId) {
    recomputed = await deleteOptimisticEntry(customerId, id);
  }

  await addToQueue({
    type: 'deleteEntry',
    payload: { id, customerId },
  });

  return {
    message: 'Entry deleted offline',
    balance: recomputed?.customer?.balance || 0,
  };
};
