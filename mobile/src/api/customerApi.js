// src/api/customerApi.js
// Customer (Gahak) API service functions

import apiClient from './client';

/**
 * Fetches all customers for the logged-in user, with optional search query
 * @param {string} [searchQuery]
 * @returns {Promise<Array>} List of customer objects
 */
export const getCustomers = async (searchQuery = '') => {
  try {
    const params = {};
    if (searchQuery && searchQuery.trim()) {
      params.search = searchQuery.trim();
    }
    const response = await apiClient.get('/customers', { params });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to load customers';
    throw new Error(message);
  }
};

/**
 * Fetches a single customer by ID
 * @param {string} id
 * @returns {Promise<Object>} Customer object
 */
export const getCustomerById = async (id) => {
  try {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to load customer details';
    throw new Error(message);
  }
};

/**
 * Creates a new customer
 * @param {string} name
 * @param {string} [phone]
 * @returns {Promise<Object>} Created customer object
 */
export const createCustomer = async (name, phone = '') => {
  try {
    const response = await apiClient.post('/customers', {
      name,
      phone,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to create customer';
    throw new Error(message);
  }
};

/**
 * Updates an existing customer's name and phone
 * @param {string} id
 * @param {string} name
 * @param {string} [phone]
 * @returns {Promise<Object>} Updated customer object
 */
export const updateCustomer = async (id, name, phone = '') => {
  try {
    const response = await apiClient.put(`/customers/${id}`, {
      name,
      phone,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to update customer';
    throw new Error(message);
  }
};

/**
 * Deletes a customer by ID
 * @param {string} id
 * @returns {Promise<Object>} Deletion result
 */
export const deleteCustomer = async (id) => {
  try {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to delete customer';
    throw new Error(message);
  }
};
