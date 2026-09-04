// src/api/client.js
// Axios HTTP client instance configuration with SecureStore token interceptor and global error handlers

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

/**
 * Automatically determine the backend URL:
 * 1. Production EAS build: Uses EXPO_PUBLIC_API_BASE_URL (points to live Vercel backend https://.../api)
 * 2. Local Expo Go / Development: Auto-resolves machine Wi-Fi IP (192.168.100.6)
 */
const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  // 1. If an environment variable is defined and is not localhost, use it directly (e.g. Vercel production)
  if (envUrl && envUrl.trim() !== '' && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.trim();
  }

  // 2. Try host URI from Expo dev server during local Expo Go development
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api`;
    }
  }

  // 3. Fallback for physical device local testing if no env or hostUri is found
  return 'https://daily-tally-theta.vercel.app/api';
};

const API_BASE_URL = getBaseUrl();
console.log('🔗 Connecting to Backend API at:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Listener for global 401 unauthorized session expiry
let onUnauthorizedCallback = null;

export const setUnauthorizedHandler = (callback) => {
  onUnauthorizedCallback = callback;
};

/**
 * Request interceptor: attaches Bearer token from SecureStore if available
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to retrieve authToken for request interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor:
 * - Detects 401 (token expired/invalid) and logs user out automatically
 * - Catches network dropouts and translates them to friendly messages
 * - Passes through backend { error: "..." }
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 1. Handle 401 Unauthorized / Token Expiry
    if (error.response?.status === 401) {
      console.warn('🔒 401 Session expired or unauthorized.');
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      Alert.alert(
        'Session Expired',
        'Aapka session khatam ho gaya hai. Barah-e-karam dobara login karein.'
      );
      return Promise.reject(new Error('Session expired, please log in again'));
    }

    // 2. Handle Network / Connection Dropouts
    if (!error.response || error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      const friendlyMsg =
        'Internet connection ya server se rabta nahi ho saka. Barah-e-karam apna connection check karein.';
      const netError = new Error(friendlyMsg);
      netError.isNetworkError = true;
      return Promise.reject(netError);
    }

    // 3. Handle Backend Custom Error Messages
    const backendMsg = error.response?.data?.error;
    if (backendMsg) {
      return Promise.reject(new Error(backendMsg));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
