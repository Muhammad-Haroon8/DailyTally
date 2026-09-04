// src/api/itemApi.js
// Item Master API service functions with offline support & local caching

import apiClient from './client';
import NetInfo from '@react-native-community/netinfo';
import {
  getCachedItems,
  saveCachedItems,
  upsertCachedItem,
  removeCachedItem,
} from '../storage/localCache';
import { addToQueue, generateLocalId } from '../storage/offlineQueue';

const checkIsOnline = async () => {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
};

/**
 * Fetches all items in master catalog for logged-in user.
 * Saves to cache on success, falls back to cache on offline.
 * @returns {Promise<Array>} List of items sorted alphabetically
 */
export const getItems = async () => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get('/items');
      await saveCachedItems(response.data);
      return response.data;
    } catch (error) {
      console.warn('Online getItems failed, falling back to cache:', error.message);
    }
  }

  const cached = await getCachedItems();
  if (cached) {
    return cached.map((i) => ({ ...i, isFromCache: true }));
  }

  throw new Error('Internet nahi hai aur items ka cache maujood nahi hai.');
};

/**
 * Fetches a single item by ID
 * @param {string} id
 * @returns {Promise<Object>} Item object
 */
export const getItemById = async (id) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get(`/items/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Online getItemById failed, checking cache:', error.message);
    }
  }

  const cached = await getCachedItems();
  if (cached) {
    const item = cached.find((i) => i._id === id);
    if (item) return { ...item, isFromCache: true };
  }

  throw new Error('Item ki tafseelat nahi mil sakeen.');
};

/**
 * Creates a new item in the master list.
 * If offline: generates temp ID, saves to cache, queues action.
 * @param {string} name
 * @param {number} defaultRate
 * @returns {Promise<Object>} Created item object
 */
export const createItem = async (name, defaultRate) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.post('/items', { name, defaultRate });
      await upsertCachedItem(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('createItem online call failed, queuing offline:', error.message);
    }
  }

  const tempId = generateLocalId('item');
  const localItem = {
    _id: tempId,
    name: name.trim(),
    defaultRate: Number(defaultRate) || 0,
    isLocal: true,
    createdAt: new Date().toISOString(),
  };

  await upsertCachedItem(localItem);
  await addToQueue({
    type: 'createItem',
    tempId,
    payload: { name: name.trim(), defaultRate: Number(defaultRate) || 0 },
  });

  return localItem;
};

/**
 * Updates an item's name and/or default rate
 * @param {string} id
 * @param {string} name
 * @param {number} defaultRate
 * @returns {Promise<Object>} Updated item object
 */
export const updateItem = async (id, name, defaultRate) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.put(`/items/${id}`, { name, defaultRate });
      await upsertCachedItem(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      console.warn('updateItem online call failed, queuing offline:', error.message);
    }
  }

  const updatedItem = {
    _id: id,
    name: name.trim(),
    defaultRate: Number(defaultRate) || 0,
  };

  await upsertCachedItem(updatedItem);
  await addToQueue({
    type: 'updateItem',
    payload: { id, name: name.trim(), defaultRate: Number(defaultRate) || 0 },
  });

  return updatedItem;
};

/**
 * Deletes an item by ID
 * @param {string} id
 * @returns {Promise<Object>} Result object
 */
export const deleteItem = async (id) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.delete(`/items/${id}`);
      await removeCachedItem(id);
      return response.data;
    } catch (error) {
      console.warn('deleteItem online call failed, queuing offline:', error.message);
    }
  }

  await removeCachedItem(id);
  await addToQueue({
    type: 'deleteItem',
    payload: { id },
  });

  return { message: 'Item deleted offline' };
};
