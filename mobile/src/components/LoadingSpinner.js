// src/components/LoadingSpinner.js
// Reusable centered loading indicator

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';

export default function LoadingSpinner({ message = 'Loading...', color = colors.primary }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.bodySmall,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
