// src/storage/storageAdapter.js
// Persistent Storage Adapter for Expo
// Uses Expo FileSystem (documentDirectory) which is 100% built into the Expo Go client
// and never fails with "Native module is null" like external AsyncStorage packages.

import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_DIR = `${FileSystem.documentDirectory}app_storage/`;

let isDirCreated = false;
const ensureStorageDir = async () => {
  if (isDirCreated) return;
  try {
    const info = await FileSystem.getInfoAsync(STORAGE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
    }
    isDirCreated = true;
  } catch (err) {
    console.warn('Storage directory initialization note:', err.message);
  }
};

const sanitizeKey = (key) => {
  return encodeURIComponent(key).replace(/[*~()'!]/g, '_');
};

const getFilePath = (key) => {
  return `${STORAGE_DIR}${sanitizeKey(key)}.json`;
};

export const storage = {
  /**
   * Retrieves string value for key
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async getItem(key) {
    try {
      await ensureStorageDir();
      const path = getFilePath(key);
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(path);
    } catch (err) {
      console.warn(`Error reading key ${key} from storage:`, err.message);
      return null;
    }
  },

  /**
   * Sets string value for key
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    try {
      await ensureStorageDir();
      const path = getFilePath(key);
      await FileSystem.writeAsStringAsync(path, value);
    } catch (err) {
      console.error(`Error saving key ${key} to storage:`, err);
    }
  },

  /**
   * Removes key
   * @param {string} key
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    try {
      await ensureStorageDir();
      const path = getFilePath(key);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch (err) {
      console.warn(`Error removing key ${key} from storage:`, err.message);
    }
  },
};

export default storage;
