// src/api/wholesalerApi.js
// Wholesaler (Saudagar) API service functions with local caching

import apiClient from './client';
import NetInfo from '@react-native-community/netinfo';
import {
  getCachedWholesalers,
  saveCachedWholesalers,
  upsertCachedWholesaler,
  removeCachedWholesaler,
  getCachedWholesalerAnalyticsSummary,
  saveCachedWholesalerAnalyticsSummary,
} from '../storage/localCache';

const checkIsOnline = async () => {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
};

/**
 * Fetches aggregated business-wide wholesaler analytics: totalKharedari, totalPayment, and baqiBaqaya.
 */
export const getWholesalerAnalyticsSummary = async () => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get('/wholesalers/analytics/summary');
      if (response.data) {
        await saveCachedWholesalerAnalyticsSummary(response.data);
      }
      return response.data;
    } catch (error) {
      console.warn('Online getWholesalerAnalyticsSummary failed, attempting cache fallback:', error.message);
    }
  }

  const cached = await getCachedWholesalerAnalyticsSummary();
  if (cached) {
    return cached;
  }

  return { totalKharedari: 0, totalPayment: 0, baqiBaqaya: 0 };
};

/**
 * Fetches all wholesalers for the logged-in user, with optional search query.
 */
export const getWholesalers = async (searchQuery = '') => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const params = {};
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await apiClient.get('/wholesalers', { params });
      if (!searchQuery || !searchQuery.trim()) {
        await saveCachedWholesalers(response.data);
      }
      return response.data;
    } catch (error) {
      console.warn('Online getWholesalers failed, attempting local cache fallback:', error.message);
    }
  }

  // Fallback to local cache
  const cached = await getCachedWholesalers();
  if (cached) {
    let result = cached.map((w) => ({ ...w, isFromCache: true }));
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.phone && w.phone.includes(q))
      );
    }
    return result;
  }

  throw new Error('Internet nahi hai aur pehle se koi cached data maujood nahi hai.');
};

/**
 * Fetches a single wholesaler by ID.
 */
export const getWholesalerById = async (id) => {
  const online = await checkIsOnline();

  if (online) {
    try {
      const response = await apiClient.get(`/wholesalers/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Online getWholesalerById failed:', error.message);
    }
  }

  const cached = await getCachedWholesalers();
  if (cached) {
    const found = cached.find((w) => w._id === id);
    if (found) return found;
  }

  throw new Error('Wholesaler data load nahi ho saka.');
};

/**
 * Creates a new wholesaler.
 */
export const createWholesaler = async ({ name, phone }) => {
  const online = await checkIsOnline();

  if (online) {
    const response = await apiClient.post('/wholesalers', {
      name: name.trim(),
      phone: phone ? phone.trim() : '',
    });
    await upsertCachedWholesaler(response.data);
    return response.data;
  }

  throw new Error('Wholesaler add karne ke liye internet connection darkar hai.');
};

/**
 * Updates an existing wholesaler.
 */
export const updateWholesaler = async (id, { name, phone }) => {
  const response = await apiClient.put(`/wholesalers/${id}`, {
    name: name.trim(),
    phone: phone ? phone.trim() : '',
  });

  await upsertCachedWholesaler(response.data);
  return response.data;
};

/**
 * Deletes a wholesaler.
 */
export const deleteWholesaler = async (id) => {
  const response = await apiClient.delete(`/wholesalers/${id}`);
  await removeCachedWholesaler(id);
  return response.data;
};
