// src/api/wholesalerItemApi.js
// Wholesaler Item Master API service functions with offline support & local caching
// Independent of the Customer module's Item API

import apiClient from './client';
import NetInfo from '@react-native-community/netinfo';
import {
  getCachedWholesalerItems,
  saveCachedWholesalerItems,
  upsertCachedWholesalerItem,
  removeCachedWholesalerItem,
} from '../storage/localCache';
import { addToQueue, generateLocalId } from '../storage/offlineQueue';

const checkIsOnline = async () => {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
};

/**
 * Fetches all items in wholesaler purchase catalog for logged-in user.
 * Saves to cache on success, falls back to cache on offline.
 * @returns {Promise<Array>} List of wholesaler items sorted alphabetically
 */
export const getWholesalerItems = async () => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get('/wholesaler-items');
      await saveCachedWholesalerItems(response.data);
      return response.data;
    } catch (error) {
      console.warn('Online getWholesalerItems failed, falling back to cache:', error.message);
    }
  }

  const cached = await getCachedWholesalerItems();
  if (cached) {
    return cached.map((i) => ({ ...i, isFromCache: true }));
  }

  throw new Error('Internet nahi hai aur wholesaler items ka cache maujood nahi hai.');
};

/**
 * Fetches a single wholesaler item by ID
 * @param {string} id
 * @returns {Promise<Object>} Wholesaler Item object
 */
export const getWholesalerItemById = async (id) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get(`/wholesaler-items/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Online getWholesalerItemById failed, checking cache:', error.message);
    }
  }

  const cached = await getCachedWholesalerItems();
  if (cached) {
    const item = cached.find((i) => i._id === id);
    if (item) return { ...item, isFromCache: true };
  }

  throw new Error('Wholesaler item ki tafseelat nahi mil sakeen.');
};

/**
 * Creates a new wholesaler purchase item in the catalog.
 * If offline: generates temp ID, saves to cache, queues action.
 * @param {string} name
 * @param {number} defaultRate
 * @returns {Promise<Object>} Created wholesaler item object
 */
export const createWholesalerItem = async (name, defaultRate) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.post('/wholesaler-items', { name, defaultRate });
      await upsertCachedWholesalerItem(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('createWholesalerItem online call failed, queuing offline:', error.message);
    }
  }

  const tempId = generateLocalId('wholesalerItem');
  const localItem = {
    _id: tempId,
    name: name.trim(),
    defaultRate: Number(defaultRate) || 0,
    isLocal: true,
    createdAt: new Date().toISOString(),
  };

  await upsertCachedWholesalerItem(localItem);

  await addToQueue({
    type: 'CREATE_WHOLESALER_ITEM',
    url: '/wholesaler-items',
    method: 'POST',
    payload: { name: name.trim(), defaultRate: Number(defaultRate) || 0 },
    tempId,
  });

  return localItem;
};

/**
 * Updates a wholesaler purchase item (name & default rate).
 * @param {string} id
 * @param {string} name
 * @param {number} defaultRate
 * @returns {Promise<Object>} Updated item object
 */
export const updateWholesalerItem = async (id, name, defaultRate) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.put(`/wholesaler-items/${id}`, { name, defaultRate });
      await upsertCachedWholesalerItem(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 409) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('updateWholesalerItem online call failed, queuing offline:', error.message);
    }
  }

  const updatedItem = {
    _id: id,
    name: name.trim(),
    defaultRate: Number(defaultRate) || 0,
    isLocal: true,
  };

  await upsertCachedWholesalerItem(updatedItem);

  await addToQueue({
    type: 'UPDATE_WHOLESALER_ITEM',
    url: `/wholesaler-items/${id}`,
    method: 'PUT',
    payload: { name: name.trim(), defaultRate: Number(defaultRate) || 0 },
    entityId: id,
  });

  return updatedItem;
};

/**
 * Deletes a wholesaler purchase item.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const deleteWholesalerItem = async (id) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      await apiClient.delete(`/wholesaler-items/${id}`);
      await removeCachedWholesalerItem(id);
      return { success: true, id };
    } catch (error) {
      console.warn('deleteWholesalerItem online call failed, queuing offline:', error.message);
    }
  }

  await removeCachedWholesalerItem(id);

  await addToQueue({
    type: 'DELETE_WHOLESALER_ITEM',
    url: `/wholesaler-items/${id}`,
    method: 'DELETE',
    payload: {},
    entityId: id,
  });

  return { success: true, id };
};
