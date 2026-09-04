// src/api/reportApi.js
// API helper to request, download, and store PDF statements locally using FileSystem

import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import apiClient from './client';

/**
 * Downloads the customer hisab PDF report from backend and saves it locally
 * @param {string} customerId
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 * @param {string} customerName
 * @returns {Promise<string>} Local file URI
 */
export const downloadReportPdf = async (customerId, startDate, endDate, customerName = 'Gahak') => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    const baseURL = apiClient.defaults.baseURL;
    const url = `${baseURL}/customers/${customerId}/report/pdf?startDate=${startDate}&endDate=${endDate}`;

    const safeName = (customerName || 'Gahak').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Hisab_${safeName}_${startDate}_to_${endDate}.pdf`;
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
    console.error('Error downloading report PDF:', error);
    const msg = error.message || 'Report PDF download karne me dushwari pesh aayi.';
    throw new Error(msg);
  }
};
