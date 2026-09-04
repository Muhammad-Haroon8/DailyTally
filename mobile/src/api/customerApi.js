// src/api/customerApi.js
// Customer (Gahak) API service functions with offline support & local caching

import apiClient from './client';
import NetInfo from '@react-native-community/netinfo';
import {
  getCachedCustomers,
  saveCachedCustomers,
  upsertCachedCustomer,
  removeCachedCustomer,
} from '../storage/localCache';
import { addToQueue, generateLocalId } from '../storage/offlineQueue';

const checkIsOnline = async () => {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
};

/**
 * Fetches all customers for the logged-in user, with optional search query.
 * Caches results on success. Falls back to cached data if offline.
 * @param {string} [searchQuery]
 * @returns {Promise<Array>} List of customer objects
 */
export const getCustomers = async (searchQuery = '') => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const params = {};
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await apiClient.get('/customers', { params });
      // Only cache the full unfiltered list
      if (!searchQuery || !searchQuery.trim()) {
        await saveCachedCustomers(response.data);
      }
      return response.data;
    } catch (error) {
      console.warn('Online getCustomers failed, attempting local cache fallback:', error.message);
    }
  }

  // Fallback to local cache
  const cached = await getCachedCustomers();
  if (cached) {
    let result = cached.map((c) => ({ ...c, isFromCache: true }));
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      );
    }
    return result;
  }

  throw new Error('Internet nahi hai aur pehle se koi cached data maujood nahi hai.');
};

/**
 * Fetches a single customer by ID
 * @param {string} id
 * @returns {Promise<Object>} Customer object
 */
export const getCustomerById = async (id) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Online getCustomerById failed, looking in cache:', error.message);
    }
  }

  // Look in cached customers
  const cached = await getCachedCustomers();
  if (cached) {
    const found = cached.find((c) => c._id === id);
    if (found) {
      return { ...found, isFromCache: true };
    }
  }

  throw new Error('Gahak ki tafseelat load nahi ho sakeen.');
};

/**
 * Creates a new customer.
 * If offline: generates temp local ID, updates local cache, queues action.
 * @param {string} name
 * @param {string} [phone]
 * @returns {Promise<Object>} Created customer object
 */
export const createCustomer = async (name, phone = '') => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.post('/customers', { name, phone });
      await upsertCachedCustomer(response.data);
      return response.data;
    } catch (error) {
      // If validation error from backend, rethrow
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('createCustomer online call failed, falling back to offline queue:', error.message);
    }
  }

  // Offline creation
  const tempId = generateLocalId('cust');
  const localCustomer = {
    _id: tempId,
    name: name.trim(),
    phone: phone ? phone.trim() : '',
    balance: 0,
    isLocal: true,
    createdAt: new Date().toISOString(),
  };

  await upsertCachedCustomer(localCustomer);
  await addToQueue({
    type: 'createCustomer',
    tempId,
    payload: { name: name.trim(), phone: phone ? phone.trim() : '' },
  });

  return localCustomer;
};

/**
 * Updates an existing customer's name and phone.
 * If offline: updates local cache and queues action.
 * @param {string} id
 * @param {string} name
 * @param {string} [phone]
 * @returns {Promise<Object>} Updated customer object
 */
export const updateCustomer = async (id, name, phone = '') => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.put(`/customers/${id}`, { name, phone });
      await upsertCachedCustomer(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('updateCustomer online call failed, queuing offline:', error.message);
    }
  }

  // Offline update
  const updatedCustomer = {
    _id: id,
    name: name.trim(),
    phone: phone ? phone.trim() : '',
  };
  await upsertCachedCustomer(updatedCustomer);
  await addToQueue({
    type: 'updateCustomer',
    payload: { id, name: name.trim(), phone: phone ? phone.trim() : '' },
  });

  return updatedCustomer;
};

/**
 * Deletes a customer by ID.
 * If offline: removes from local cache and queues action.
 * @param {string} id
 * @returns {Promise<Object>} Deletion result
 */
export const deleteCustomer = async (id) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.delete(`/customers/${id}`);
      await removeCachedCustomer(id);
      return response.data;
    } catch (error) {
      console.warn('deleteCustomer online call failed, queuing offline:', error.message);
    }
  }

  // Offline delete
  await removeCachedCustomer(id);
  await addToQueue({
    type: 'deleteCustomer',
    payload: { id },
  });

  return { message: 'Customer deleted offline' };
};
