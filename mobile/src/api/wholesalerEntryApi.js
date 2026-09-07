// src/api/wholesalerEntryApi.js
// Wholesaler purchase and payment entry API service functions with local caching

import apiClient from './client';
import NetInfo from '@react-native-community/netinfo';
import {
  getCachedWholesalerDetail,
  saveCachedWholesalerDetail,
} from '../storage/localCache';

const checkIsOnline = async () => {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
};

/**
 * Fetches all entries and monthly breakdown for a specific wholesaler.
 */
export const getEntriesByWholesaler = async (wholesalerId) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get(`/wholesalers/${wholesalerId}/entries`);
      if (response.data) {
        await saveCachedWholesalerDetail(wholesalerId, response.data);
      }
      return response.data;
    } catch (error) {
      console.warn('Online getEntriesByWholesaler failed, using cache:', error.message);
    }
  }

  const cached = await getCachedWholesalerDetail(wholesalerId);
  if (cached) {
    return cached;
  }

  throw new Error('Wholesaler ka hisab load nahi ho saka. Internet connection check karein.');
};

/**
 * Creates a new purchase or payment entry for a wholesaler.
 */
export const createWholesalerEntry = async (entryData) => {
  const online = await checkIsOnline();

  if (online) {
    const response = await apiClient.post('/wholesaler-entries', entryData);
    return response.data;
  }

  throw new Error('Entry save karne ke liye internet connection darkar hai.');
};

/**
 * Updates an existing wholesaler entry.
 */
export const updateWholesalerEntry = async (entryId, entryData) => {
  const response = await apiClient.put(`/wholesaler-entries/${entryId}`, entryData);
  return response.data;
};

/**
 * Deletes a wholesaler entry.
 */
export const deleteWholesalerEntry = async (entryId) => {
  const response = await apiClient.delete(`/wholesaler-entries/${entryId}`);
  return response.data;
};
