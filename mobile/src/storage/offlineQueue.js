// src/storage/offlineQueue.js
// Persistent Action Queue for Offline Operations
// Stores pending actions (create, update, delete for customers, items, entries)
// and handles sequential queue processing, retries, and ID remapping.

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_STORAGE_KEY = '@daily_tally_offline_queue';

/**
 * Generates a unique temporary ID for offline created entities
 * @param {string} prefix 'cust' | 'item' | 'entry' | 'act'
 * @returns {string} e.g. "local-cust-1725450000000-4821"
 */
export const generateLocalId = (prefix = 'id') => {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `local-${prefix}-${timestamp}-${randomSuffix}`;
};

/**
 * Checks if an ID is a temporary local ID
 * @param {string} id
 * @returns {boolean}
 */
export const isLocalId = (id) => {
  return typeof id === 'string' && id.startsWith('local-');
};

/**
 * Fetches the current action queue from AsyncStorage
 * @returns {Promise<Array>} Array of queued actions
 */
export const getQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error reading offline queue:', error);
    return [];
  }
};

/**
 * Appends a new action to the offline queue
 * @param {Object} action { type, payload, tempId, customerId, etc. }
 * @returns {Promise<Object>} The enqueued action with id and timestamp
 */
export const addToQueue = async (action) => {
  try {
    const queue = await getQueue();
    const queuedAction = {
      id: generateLocalId('act'),
      createdAt: Date.now(),
      ...action,
    };
    queue.push(queuedAction);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    console.log(`📥 [OfflineQueue] Enqueued action: ${queuedAction.type} (${queuedAction.id})`);
    return queuedAction;
  } catch (error) {
    console.error('Error adding to offline queue:', error);
    throw error;
  }
};

/**
 * Removes a specific action by ID after successful sync
 * @param {string} actionId
 * @returns {Promise<Array>} The remaining queue
 */
export const removeFromQueue = async (actionId) => {
  try {
    const queue = await getQueue();
    const updated = queue.filter((item) => item.id !== actionId);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    console.log(`📤 [OfflineQueue] Removed action: ${actionId}`);
    return updated;
  } catch (error) {
    console.error('Error removing action from queue:', error);
    throw error;
  }
};

/**
 * Clears the entire offline queue (safety reset or after full successful sync)
 */
export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    console.log('🧹 [OfflineQueue] Queue cleared.');
  } catch (error) {
    console.error('Error clearing offline queue:', error);
    throw error;
  }
};

/**
 * Remaps temporary local IDs to real server MongoDB IDs across all remaining queued actions.
 * Example: A customer was created offline with tempId "local-cust-123".
 * When synced, the server gave back realId "66b1a...".
 * Any remaining actions (e.g. createEntry for that customer) must now use "66b1a...".
 *
 * @param {string} tempId
 * @param {string} realId
 */
export const remapQueueIds = async (tempId, realId) => {
  if (!tempId || !realId) return;

  try {
    const queue = await getQueue();
    let hasChanges = false;

    const updatedQueue = queue.map((action) => {
      let modified = false;
      const payload = { ...action.payload };

      // Check customerId in payload
      if (payload.customerId === tempId) {
        payload.customerId = realId;
        modified = true;
      }

      // Check itemId in payload
      if (payload.itemId === tempId) {
        payload.itemId = realId;
        modified = true;
      }

      // Check direct action references
      let newCustomerId = action.customerId;
      if (action.customerId === tempId) {
        newCustomerId = realId;
        modified = true;
      }

      if (modified) {
        hasChanges = true;
        return {
          ...action,
          payload,
          customerId: newCustomerId,
        };
      }
      return action;
    });

    if (hasChanges) {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));
      console.log(`🔄 [OfflineQueue] Remapped ID from ${tempId} -> ${realId} across queued actions`);
    }
  } catch (error) {
    console.error('Error remapping queue IDs:', error);
  }
};
