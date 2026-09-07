// src/api/wholesalerReportApi.js
// API helper to request, download, and store Wholesaler PDF statements locally using FileSystem

import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import apiClient from './client';

/**
 * Downloads the wholesaler hisab PDF report from backend and saves it locally
 * @param {string} wholesalerId
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 * @param {string} wholesalerName
 * @returns {Promise<string>} Local file URI
 */
export const downloadWholesalerReportPdf = async (wholesalerId, startDate, endDate, wholesalerName = 'Wholesaler') => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    const baseURL = apiClient.defaults.baseURL;
    const url = `${baseURL}/wholesalers/${wholesalerId}/report/pdf?startDate=${startDate}&endDate=${endDate}`;

    const safeName = (wholesalerName || 'Wholesaler').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Wholesaler_${safeName}_${startDate}_to_${endDate}.pdf`;
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
    console.error('Error downloading wholesaler report PDF:', error);
    const msg = error.message || 'Wholesaler report PDF download karne me dushwari pesh aayi.';
    throw new Error(msg);
  }
};
