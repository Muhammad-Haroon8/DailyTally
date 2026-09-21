// src/api/customerPortalApi.js
// API client methods for Customer Self-Service Portal

import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import apiClient from './client';

/**
 * Customer Phone Login (No password/OTP)
 * @param {string} phone
 * @param {string} [customerId] - Optional customerId for multi-shop disambiguation
 * @returns {Promise<Object>}
 */
export const customerLoginRequest = async (phone, customerId = null) => {
  const payload = { phone };
  if (customerId) {
    payload.customerId = customerId;
  }
  const response = await apiClient.post('/customer-auth/login', payload);
  return response.data;
};

/**
 * Fetch customer profile, shop info, and lifetime totals
 * @returns {Promise<Object>}
 */
export const getCustomerPortalMeRequest = async () => {
  const response = await apiClient.get('/customer-portal/me');
  return response.data;
};

/**
 * Fetch customer entries grouped by month
 * @returns {Promise<Object>}
 */
export const getCustomerPortalEntriesRequest = async () => {
  const response = await apiClient.get('/customer-portal/entries');
  return response.data;
};

/**
 * Download customer PDF statement
 * @param {Object} params
 * @param {string} [params.startDate] - YYYY-MM-DD
 * @param {string} [params.endDate] - YYYY-MM-DD
 * @param {string} [params.customerName]
 * @returns {Promise<string>} Local file URI
 */
export const downloadCustomerPortalPdf = async ({
  startDate = null,
  endDate = null,
  customerName = 'Customer',
} = {}) => {
  try {
    const token = await SecureStore.getItemAsync('customerAuthToken');
    const baseURL = apiClient.defaults.baseURL;
    let url = `${baseURL}/customer-portal/report/pdf`;

    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const safeName = (customerName || 'Statement').replace(/[^a-zA-Z0-9]/g, '_');
    const rangeSuffix = startDate && endDate ? `_${startDate}_to_${endDate}` : '_AllTime';
    const filename = `Statement_${safeName}${rangeSuffix}.pdf`;
    const targetFileUri = `${FileSystem.documentDirectory}${filename}`;

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      targetFileUri,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (!result || result.status !== 200) {
      throw new Error(`Server returned error status ${result?.status || 'unknown'}`);
    }

    return result.uri;
  } catch (error) {
    console.error('Error downloading customer statement PDF:', error);
    const msg = error.message || 'Statement PDF download karne me dushwari pesh aayi.';
    throw new Error(msg);
  }
};
