// src/screens/customerPortal/CustomerPortalWeekDetailScreen.js
// Customer Self-Service Portal - Read-Only Week Screen
// Thursday-to-Wednesday week totals, paper-receipt daily entries, and week PDF download

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, cardStyles } from '../../constants/theme';
import { downloadCustomerPortalPdf } from '../../api/customerPortalApi';
import { getWeekFallback } from '../../utils/weekBoundaries';

/**
 * Formats date into friendly conversational text: e.g. "4 September 2026"
 */
const formatFriendlyDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};

export default function CustomerPortalWeekDetailScreen({ route }) {
  const {
    monthKey,
    monthLabel,
    weekNum,
    weekLabel,
    dateRange,
    startDay: paramStartDay,
    endDay: paramEndDay,
    initialMonthData,
    customerName,
    shopName,
  } = route.params || {};

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Defensive week boundaries fallback using shared Thursday-anchored utility
  const { startDay, endDay } = useMemo(() => {
    if (paramStartDay && paramEndDay) {
      return { startDay: Number(paramStartDay), endDay: Number(paramEndDay) };
    }
    return getWeekFallback(monthKey, weekNum);
  }, [paramStartDay, paramEndDay, monthKey, weekNum]);

  // Compute exact date range for this week
  const weekDateRange = useMemo(() => {
    if (!monthKey || !startDay || !endDay) return null;
    return {
      start: `${monthKey}-${String(startDay).padStart(2, '0')}`,
      end: `${monthKey}-${String(endDay).padStart(2, '0')}`,
    };
  }, [monthKey, startDay, endDay]);

  // Extract entries falling into this week
  const weekEntries = useMemo(() => {
    if (!initialMonthData || !initialMonthData.entries) return [];

    return initialMonthData.entries.filter((entry) => {
      const d = new Date(entry.entryDate);
      const day = d.getDate();
      return day >= Number(startDay) && day <= Number(endDay);
    });
  }, [initialMonthData, startDay, endDay]);

  // Totals for this week
  const weekTotals = useMemo(() => {
    let udhaar = 0;
    let wasool = 0;

    weekEntries.forEach((entry) => {
      if (entry.type === 'item') {
        udhaar += entry.amount;
      } else {
        wasool += entry.amount;
      }
    });

    udhaar = Math.round(udhaar * 100) / 100;
    wasool = Math.round(wasool * 100) / 100;
    const net = Math.round((udhaar - wasool) * 100) / 100;

    return { udhaar, wasool, net };
  }, [weekEntries]);

  const handleDownloadWeekPdf = async () => {
    if (!weekDateRange) return;
    try {
      setIsDownloadingPdf(true);
      const fileUri = await downloadCustomerPortalPdf({
        startDate: weekDateRange.start,
        endDate: weekDateRange.end,
        customerName: customerName || 'Gahak',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${weekLabel || 'Hafte Ka Hisab'} Statement`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Ready', `Statement download ho chuki hai:\n${fileUri}`);
      }
    } catch (error) {
      Alert.alert('PDF Error', error.message || 'Statement generate nahi ho saki.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={weekEntries}
        keyExtractor={(item, index) => item._id || String(index)}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Week Summary Card */}
            <Card style={styles.summaryCard}>
              <Text style={styles.weekHeaderTitle}>
                {dateRange || `${startDay} - ${endDay}`} ({weekLabel || `Week ${weekNum}`})
              </Text>
              <Text style={styles.shopSubText}>
                {monthLabel} • 🏪 {shopName || 'Karobar Hisab'} • {customerName || 'Gahak'}
              </Text>

              {/* 3 Metrics: Kitna Liya, Kitna Diya, Hafte Ka Net */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Kitna Liya</Text>
                  <Text style={[styles.statBoxValue, { color: colors.accent }]}>
                    Rs. {weekTotals.udhaar.toLocaleString()}
                  </Text>
                  <Text style={styles.statBoxHint}>(Udhaar)</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Kitna Diya</Text>
                  <Text style={[styles.statBoxValue, { color: colors.success }]}>
                    Rs. {weekTotals.wasool.toLocaleString()}
                  </Text>
                  <Text style={styles.statBoxHint}>(Wasool)</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Hafte Ka Net</Text>
                  <Text
                    style={[
                      styles.statBoxValue,
                      {
                        fontWeight: 'bold',
                        color: weekTotals.net > 0 ? colors.danger : colors.success,
                      },
                    ]}
                  >
                    {weekTotals.net > 0 ? '+' : ''}
                    Rs. {weekTotals.net.toLocaleString()}
                  </Text>
                  <Text style={styles.statBoxHint}>
                    {weekTotals.net > 0 ? '(Baqaya)' : '(Adaigi)'}
                  </Text>
                </View>
              </View>

              {/* Big PDF Button */}
              <TouchableOpacity
                style={styles.bigPdfButton}
                onPress={handleDownloadWeekPdf}
                disabled={isDownloadingPdf}
                activeOpacity={0.85}
              >
                {isDownloadingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.bigPdfIcon}>📄</Text>
                    <Text style={styles.bigPdfText}>
                      Is Hafte Ka PDF Download Karein
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>📝 Is Hafte Ki Transactions</Text>
            </View>
          </View>
        }
        renderItem={({ item: entry }) => {
          const isUdhaar = entry.type === 'item';

          return (
            <Card
              style={[
                styles.entryCard,
                isUdhaar ? styles.entryCardUdhaar : styles.entryCardWasool,
              ]}
            >
              <View style={styles.entryRow}>
                {/* Transaction Icon */}
                <View
                  style={[
                    styles.entryIconBox,
                    {
                      backgroundColor: isUdhaar
                        ? colors.accentLight
                        : colors.successLight,
                    },
                  ]}
                >
                  <Text style={styles.entryIconText}>
                    {isUdhaar ? '📦' : '💵'}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.entryDetails}>
                  <Text style={styles.entryMainTitle}>
                    {isUdhaar ? entry.itemName : 'Paise Jama Karwaye (Adaigi)'}
                  </Text>

                  {isUdhaar && entry.quantity && entry.rate ? (
                    <Text style={styles.entrySubcalc}>
                      {entry.quantity} x Rs. {entry.rate}
                    </Text>
                  ) : null}

                  {entry.note ? (
                    <Text style={styles.entryNoteText}>"{entry.note}"</Text>
                  ) : null}

                  <Text style={styles.entryDateText}>
                    {formatFriendlyDate(entry.entryDate)}
                  </Text>
                </View>

                {/* Amount */}
                <View style={styles.entryAmountCol}>
                  <Text
                    style={[
                      styles.entryAmountText,
                      { color: isUdhaar ? colors.danger : colors.success },
                    ]}
                  >
                    {isUdhaar ? '+' : '-'} Rs. {entry.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.entryTypeLabel}>
                    {isUdhaar ? 'Udhaar' : 'Wasool'}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="Is Hafte Koi Entry Nahi"
            description="Is hafte koi kharedari ya payment darj nahi hui."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    marginBottom: spacing.sm,
  },
  summaryCard: {
    ...cardStyles,
    padding: spacing.xl,
    borderRadius: 20,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  weekHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  shopSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    width: '100%',
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: '70%',
    alignSelf: 'center',
  },
  statBoxLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  statBoxValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statBoxHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bigPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  bigPdfIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  bigPdfText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  entryCard: {
    ...cardStyles,
    padding: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.sm,
  },
  entryCardUdhaar: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  entryCardWasool: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  entryIconText: {
    fontSize: 22,
  },
  entryDetails: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  entryMainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  entrySubcalc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  entryNoteText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  entryDateText: {
    fontSize: 12,
    color: '#8C8A84',
    fontWeight: '500',
    marginTop: 2,
  },
  entryAmountCol: {
    alignItems: 'flex-end',
  },
  entryAmountText: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  entryTypeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
