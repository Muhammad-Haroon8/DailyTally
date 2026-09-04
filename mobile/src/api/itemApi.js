// src/api/itemApi.js
// Item Master API service functions

import apiClient from './client';

/**
 * Fetches all items in master catalog for logged-in user
 * @returns {Promise<Array>} List of items sorted alphabetically
 */
export const getItems = async () => {
  try {
    const response = await apiClient.get('/items');
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to load items';
    throw new Error(message);
  }
};

/**
 * Fetches a single item by ID
 * @param {string} id
 * @returns {Promise<Object>} Item object
 */
export const getItemById = async (id) => {
  try {
    const response = await apiClient.get(`/items/${id}`);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to load item details';
    throw new Error(message);
  }
};

/**
 * Creates a new item in the master list
 * @param {string} name
 * @param {number} defaultRate
 * @returns {Promise<Object>} Created item object
 */
export const createItem = async (name, defaultRate) => {
  try {
    const response = await apiClient.post('/items', {
      name,
      defaultRate,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to create item';
    throw new Error(message);
  }
};

/**
 * Updates an item's name and/or default rate
 * @param {string} id
 * @param {string} name
 * @param {number} defaultRate
 * @returns {Promise<Object>} Updated item object
 */
export const updateItem = async (id, name, defaultRate) => {
  try {
    const response = await apiClient.put(`/items/${id}`, {
      name,
      defaultRate,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to update item';
    throw new Error(message);
  }
};

/**
 * Deletes an item by ID
 * @param {string} id
 * @returns {Promise<Object>} Result object
 */
export const deleteItem = async (id) => {
  try {
    const response = await apiClient.delete(`/items/${id}`);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to delete item';
    throw new Error(message);
  }
};
