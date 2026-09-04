// src/components/EmptyState.js
// Reusable empty state component with icon, title, subtitle, and optional action button

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';
import PrimaryButton from './PrimaryButton';

export default function EmptyState({
  icon = '📋',
  title,
  subtitle,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          title={actionLabel}
          onPress={onAction}
          variant={actionVariant}
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  actionButton: {
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
});
