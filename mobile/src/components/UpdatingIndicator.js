// src/components/UpdatingIndicator.js
// Subtle, non-intrusive indicator displayed when cached data is being refreshed in the background

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '../constants/theme';

export default function UpdatingIndicator({ message = 'Taza hisab update ho raha hai...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: spacing.xs,
    borderWidth: 0.5,
    borderColor: '#B0E2D4',
  },
  spinner: {
    marginRight: 6,
    transform: [{ scale: 0.75 }],
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
});
