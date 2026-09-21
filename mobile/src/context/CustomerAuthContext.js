// src/context/CustomerAuthContext.js
// Dedicated Session Context for Customer Self-Service Portal
// Completely isolated from staff AuthContext and SecureStore keys

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { customerLoginRequest } from '../api/customerPortalApi';
import { setCustomerUnauthorizedHandler } from '../api/client';

const CustomerAuthContext = createContext(null);

const CUSTOMER_TOKEN_KEY = 'customerAuthToken';
const CUSTOMER_DATA_KEY = 'customerAuthData';

export const CustomerAuthProvider = ({ children }) => {
  const [customerUser, setCustomerUser] = useState(null);
  const [customerToken, setCustomerToken] = useState(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);

  /**
   * Logs out customer, clears customer-specific SecureStore keys, and resets state
   */
  const customerLogout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(CUSTOMER_TOKEN_KEY);
      await SecureStore.deleteItemAsync(CUSTOMER_DATA_KEY);
    } catch (error) {
      console.error('Error clearing customer SecureStore on logout:', error);
    } finally {
      setCustomerToken(null);
      setCustomerUser(null);
    }
  }, []);

  // Register 401 callback with apiClient for customer portal
  useEffect(() => {
    setCustomerUnauthorizedHandler(() => {
      customerLogout();
    });
  }, [customerLogout]);

  // Restore existing customer session from SecureStore on startup
  useEffect(() => {
    const restoreCustomerSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(CUSTOMER_TOKEN_KEY);
        const storedDataJson = await SecureStore.getItemAsync(CUSTOMER_DATA_KEY);

        if (storedToken && storedDataJson) {
          const parsedData = JSON.parse(storedDataJson);
          setCustomerToken(storedToken);
          setCustomerUser(parsedData);
        }
      } catch (error) {
        console.error('Failed to restore customer session from SecureStore:', error);
      } finally {
        setIsCustomerLoading(false);
      }
    };

    restoreCustomerSession();
  }, []);

  /**
   * Customer phone login (no password/OTP)
   * @param {string} phone
   * @param {string} [customerId]
   * @returns {Promise<Object>} Either { multiple: true, matches: [...] } or { customer, token, shopName }
   */
  const customerLogin = async (phone, customerId = null) => {
    const data = await customerLoginRequest(phone, customerId);

    // If multiple shops match, pass back to caller for selection
    if (data.multiple) {
      return data;
    }

    const { token: receivedToken, customer: receivedCustomer, shopName } = data;
    const sessionData = {
      ...receivedCustomer,
      shopName: shopName || 'Karobar Hisab Shop',
    };

    // Persist to SecureStore
    await SecureStore.setItemAsync(CUSTOMER_TOKEN_KEY, receivedToken);
    await SecureStore.setItemAsync(CUSTOMER_DATA_KEY, JSON.stringify(sessionData));

    // Update state
    setCustomerToken(receivedToken);
    setCustomerUser(sessionData);

    return data;
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customerUser,
        customerToken,
        isCustomerLoading,
        customerLogin,
        customerLogout,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

/**
 * Custom hook to consume CustomerAuthContext
 */
export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export default CustomerAuthContext;
