// src/components/EntryTypeFilter.js
// Compact Filter Chip row for filtering entries by type: Sab (All), Udhaar (Item), Wasool (Payment)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../constants/theme';

export default function EntryTypeFilter({
  filter = 'all',
  onChangeFilter,
  isOpen = false,
  onToggleOpen,
  counts = {},
  title = 'Entries',
  style,
}) {
  const options = [
    { key: 'all', label: 'Sab', count: counts.all },
    { key: 'item', label: 'Udhaar', count: counts.item },
    { key: 'payment', label: 'Wasool', count: counts.payment },
  ];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerBar}>
        <Text style={styles.sectionTitle}>{title}</Text>

        <TouchableOpacity
          style={[styles.toggleButton, (isOpen || filter !== 'all') && styles.toggleButtonActive]}
          onPress={onToggleOpen}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleIcon}>{isOpen ? '🔼' : '🔽'}</Text>
          <Text
            style={[
              styles.toggleText,
              (isOpen || filter !== 'all') && styles.toggleTextActive,
            ]}
          >
            {filter === 'all'
              ? 'Filter'
              : filter === 'item'
                ? 'Udhaar'
                : 'Wasool'}
          </Text>
        </TouchableOpacity>
      </View>

      {isOpen && (
        <View style={styles.chipsRow}>
          {options.map((opt) => {
            const isSelected = filter === opt.key;
            let activeChipStyle = styles.chipActiveAll;
            let activeTextStyle = styles.chipTextActiveAll;

            if (isSelected) {
              if (opt.key === 'item') {
                activeChipStyle = styles.chipActiveUdhaar;
                activeTextStyle = styles.chipTextActiveUdhaar;
              } else if (opt.key === 'payment') {
                activeChipStyle = styles.chipActiveWasool;
                activeTextStyle = styles.chipTextActiveWasool;
              }
            }

            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.chip, isSelected && activeChipStyle]}
                onPress={() => onChangeFilter(opt.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isSelected && activeTextStyle]}>
                  {opt.label}
                  {typeof opt.count === 'number' ? ` (${opt.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  toggleButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  toggleIcon: {
    fontSize: 11,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActiveAll: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipActiveUdhaar: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  chipActiveWasool: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActiveAll: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextActiveUdhaar: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextActiveWasool: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
