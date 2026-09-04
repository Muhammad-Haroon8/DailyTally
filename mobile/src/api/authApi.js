// src/api/authApi.js
// Authentication API service functions

import apiClient from './client';

/**
 * Sends signup request to backend
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: { id: string, name: string, email: string } }>}
 */
export const signupRequest = async (name, email, password) => {
  try {
    const response = await apiClient.post('/auth/signup', {
      name,
      email,
      password,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Signup failed. Please try again.';
    throw new Error(message);
  }
};

/**
 * Sends login request to backend
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: { id: string, name: string, email: string } }>}
 */
export const loginRequest = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Login failed. Please check your credentials.';
    throw new Error(message);
  }
};
