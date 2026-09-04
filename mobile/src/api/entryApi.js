// src/api/entryApi.js
// Entry API client functions for Udhaar (item credit) and Wasool (payment collection)

import apiClient from './client';

/**
 * Creates an entry (item credit or payment)
 * @param {Object} payload
 * @returns {Promise<{ entry: Object, balance: number }>}
 */
export const createEntry = async (payload) => {
  try {
    const response = await apiClient.post('/entries', payload);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to create entry';
    throw new Error(message);
  }
};

/**
 * Fetches all entries and current balance for a customer
 * @param {string} customerId
 * @returns {Promise<{ customer: Object, entries: Array }>}
 */
export const getEntriesByCustomer = async (customerId) => {
  try {
    const response = await apiClient.get(`/customers/${customerId}/entries`);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to load hisab entries';
    throw new Error(message);
  }
};

/**
 * Updates an existing entry
 * @param {string} id
 * @param {Object} payload
 * @returns {Promise<{ entry: Object, balance: number }>}
 */
export const updateEntry = async (id, payload) => {
  try {
    const response = await apiClient.put(`/entries/${id}`, payload);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to update entry';
    throw new Error(message);
  }
};

/**
 * Deletes an entry
 * @param {string} id
 * @returns {Promise<{ message: string, balance: number }>}
 */
export const deleteEntry = async (id) => {
  try {
    const response = await apiClient.delete(`/entries/${id}`);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to delete entry';
    throw new Error(message);
  }
};
