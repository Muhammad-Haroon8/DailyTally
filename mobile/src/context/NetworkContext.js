// src/context/NetworkContext.js
// Global Network Connectivity & Auto-Sync Engine
// Subscribes to NetInfo to detect offline/online transitions and orchestrates sequential replay of offline actions.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  getQueue,
  removeFromQueue,
  remapQueueIds,
  clearQueue,
} from '../storage/offlineQueue';
import {
  replaceEntityIdInCache,
  getCachedCustomerDetail,
  saveCachedCustomerDetail,
} from '../storage/localCache';
import apiClient from '../api/client';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState('');
  const [syncError, setSyncError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Reference to prevent duplicate concurrent sync runs
  const isSyncingRef = useRef(false);

  // Update pending queue count
  const refreshQueueCount = useCallback(async () => {
    try {
      const q = await getQueue();
      setPendingCount(q.length);
    } catch (e) {
      console.error('Error reading queue count:', e);
    }
  }, []);

  /**
   * Replays all queued actions strictly in order to the backend API.
   * If an action creates an entity (customer/item/entry), any temporary ID
   * is remapped across all remaining actions and local cache.
   */
  const syncOfflineQueue = useCallback(async () => {
    if (isSyncingRef.current) return;

    try {
      const queue = await getQueue();
      if (!queue || queue.length === 0) {
        setPendingCount(0);
        return;
      }

      isSyncingRef.current = true;
      setIsSyncing(true);
      setSyncError(null);
      setSyncSuccessMessage('');

      console.log(`🚀 [SyncEngine] Starting offline sync for ${queue.length} action(s)...`);

      for (let i = 0; i < queue.length; i++) {
        // Read fresh queue item to ensure any prior remapped IDs are taken
        const freshQueue = await getQueue();
        const action = freshQueue[0]; // Always process the head of the queue

        if (!action) break;

        console.log(`⏳ [SyncEngine] Processing action (${i + 1}/${queue.length}): ${action.type}`);

        try {
          if (action.type === 'createCustomer') {
            const res = await apiClient.post('/customers', action.payload);
            const serverCustomer = res.data;
            if (action.tempId && serverCustomer._id) {
              await replaceEntityIdInCache(action.tempId, serverCustomer._id);
              await remapQueueIds(action.tempId, serverCustomer._id);
            }
          } else if (action.type === 'updateCustomer') {
            await apiClient.put(`/customers/${action.payload.id}`, {
              name: action.payload.name,
              phone: action.payload.phone,
            });
          } else if (action.type === 'deleteCustomer') {
            await apiClient.delete(`/customers/${action.payload.id}`);
          } else if (action.type === 'createItem') {
            const res = await apiClient.post('/items', action.payload);
            const serverItem = res.data;
            if (action.tempId && serverItem._id) {
              await replaceEntityIdInCache(action.tempId, serverItem._id);
              await remapQueueIds(action.tempId, serverItem._id);
            }
          } else if (action.type === 'updateItem') {
            await apiClient.put(`/items/${action.payload.id}`, {
              name: action.payload.name,
              defaultRate: action.payload.defaultRate,
            });
          } else if (action.type === 'deleteItem') {
            await apiClient.delete(`/items/${action.payload.id}`);
          } else if (action.type === 'createEntry') {
            const res = await apiClient.post('/entries', action.payload);
            const serverEntry = res.data.entry;
            // If entry was created offline with tempId, replace it in the customer's detail cache
            if (action.tempId && serverEntry?._id && action.payload.customerId) {
              const detail = await getCachedCustomerDetail(action.payload.customerId);
              if (detail && detail.entries) {
                const updatedEntries = detail.entries.map((e) =>
                  e._id === action.tempId ? { ...serverEntry, isLocal: false } : e
                );
                // Also update any months groupings
                const updatedMonths = (detail.months || []).map((m) => ({
                  ...m,
                  entries: (m.entries || []).map((e) =>
                    e._id === action.tempId ? { ...serverEntry, isLocal: false } : e
                  ),
                }));
                await saveCachedCustomerDetail(action.payload.customerId, {
                  ...detail,
                  entries: updatedEntries,
                  months: updatedMonths,
                });
              }
            }
          } else if (action.type === 'updateEntry') {
            await apiClient.put(`/entries/${action.payload.id}`, action.payload);
          } else if (action.type === 'deleteEntry') {
            await apiClient.delete(`/entries/${action.payload.id}`);
          }

          // Successfully synced -> Remove from queue
          await removeFromQueue(action.id);
          const remaining = await getQueue();
          setPendingCount(remaining.length);
        } catch (actionErr) {
          console.error(`❌ [SyncEngine] Action ${action.type} failed:`, actionErr);
          const msg =
            actionErr.response?.data?.error ||
            actionErr.message ||
            'Sync karte waqt khata aayi.';
          setSyncError(msg);
          // Stop processing further actions to avoid out-of-order execution
          return;
        }
      }

      // Check final queue state
      const finalQueue = await getQueue();
      setPendingCount(finalQueue.length);

      if (finalQueue.length === 0) {
        console.log('✅ [SyncEngine] All queued actions synced successfully!');
        setSyncSuccessMessage('Sync mukammal ho gaya! ✅');
        setTimeout(() => setSyncSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Error during full sync:', err);
      setSyncError(err.message || 'Sync mukammal nahi ho saka.');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Subscribe to network connectivity changes
  useEffect(() => {
    let prevOnline = null;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      // Transition: OFFLINE -> ONLINE
      if (prevOnline === false && online === true) {
        console.log('📶 [NetworkContext] Network reconnected! Triggering auto-sync...');
        syncOfflineQueue();
      }

      prevOnline = online;
    });

    // Check initial queue count
    refreshQueueCount();

    // Check on launch if already online and has pending queue items
    NetInfo.fetch().then((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      prevOnline = online;
      if (online) {
        syncOfflineQueue();
      }
    });

    return () => unsubscribe();
  }, [syncOfflineQueue, refreshQueueCount]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSyncing,
        syncError,
        syncSuccessMessage,
        pendingCount,
        triggerSync: syncOfflineQueue,
        refreshQueueCount,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
