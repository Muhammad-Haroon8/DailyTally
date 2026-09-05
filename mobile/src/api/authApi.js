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

/**
 * Fetches currently authenticated user profile
 * @returns {Promise<{ id: string, name: string, email: string, phone: string, role: string }>}
 */
export const getMeRequest = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to fetch profile.';
    throw new Error(message);
  }
};

/**
 * Updates user profile (name and phone only)
 * @param {{ name?: string, phone?: string }} profileData
 * @returns {Promise<{ message: string, user: Object }>}
 */
export const updateProfileRequest = async (profileData) => {
  try {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to update profile.';
    throw new Error(message);
  }
};

/**
 * Changes user password
 * @param {{ currentPassword: string, newPassword: string }} passwordData
 * @returns {Promise<{ message: string }>}
 */
export const changePasswordRequest = async (passwordData) => {
  try {
    const response = await apiClient.put('/auth/change-password', passwordData);
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to change password.';
    throw new Error(message);
  }
};

