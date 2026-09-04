// src/components/NetworkStatusBanner.js
// Persistent status banner displayed across all screens indicating offline status, syncing progress, or errors.

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNetwork } from '../context/NetworkContext';
import { colors, spacing } from '../constants/theme';

export default function NetworkStatusBanner() {
  const {
    isOnline,
    isSyncing,
    syncError,
    syncSuccessMessage,
    pendingCount,
    triggerSync,
  } = useNetwork();

  // 1. Actively Syncing
  if (isSyncing) {
    return (
      <View style={[styles.banner, styles.bannerSyncing]}>
        <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
        <Text style={styles.bannerText}>
          Sync ho raha hai... {pendingCount > 0 ? `(${pendingCount} baqi)` : ''}
        </Text>
      </View>
    );
  }

  // 2. Sync Error with Retry Button
  if (syncError) {
    return (
      <View style={[styles.banner, styles.bannerError]}>
        <View style={styles.errorTextWrap}>
          <Text style={styles.bannerText} numberOfLines={1}>
            ⚠️ Sync me masla: {syncError}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => triggerSync()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryBtnText}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Sync Success Flash
  if (syncSuccessMessage) {
    return (
      <View style={[styles.banner, styles.bannerSuccess]}>
        <Text style={styles.bannerText}>{syncSuccessMessage}</Text>
      </View>
    );
  }

  // 4. Offline Banner
  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.bannerOffline]}>
        <Text style={styles.bannerText}>
          📡 Offline — changes save ho rahi hain, net aane par sync hongi
          {pendingCount > 0 ? ` (${pendingCount} queued)` : ''}
        </Text>
      </View>
    );
  }

  // Online and idle -> hide banner
  return null;
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  bannerOffline: {
    backgroundColor: '#D97706', // Warm Amber
  },
  bannerSyncing: {
    backgroundColor: colors.primary, // Deep Teal
  },
  bannerSuccess: {
    backgroundColor: colors.success, // Crisp Green
  },
  bannerError: {
    backgroundColor: colors.danger, // Crimson Red
    justifyContent: 'space-between',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  errorTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  retryBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  retryBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
