// src/screens/customerPortal/CustomerPortalMonthDetailScreen.js
// Customer Self-Service Portal - Read-Only Month Screen
// Paper-receipt style summary, Thursday-anchored weekly cards, and day-wise entries

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
import { getWeeksInMonth } from '../../utils/weekBoundaries';

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

export default function CustomerPortalMonthDetailScreen({ route, navigation }) {
  const { monthKey, monthLabel, monthData, customerName, shopName } = route.params || {};

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Compute exact date range for this month
  const monthRange = useMemo(() => {
    if (!monthKey) return null;
    const [y, m] = monthKey.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${monthKey}-01`,
      end: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
    };
  }, [monthKey]);

  const entries = monthData?.entries || [];

  // Group entries by Thursday-to-Wednesday Weeks
  const weeklySummaries = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    const baseWeeks = getWeeksInMonth(monthKey || monthData?.monthKey);
    const weeks = baseWeeks.map((w) => ({
      ...w,
      net: 0,
      count: 0,
    }));

    entries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      const day = d.getDate();

      const week = weeks.find((w) => day >= w.startDay && day <= w.endDay);
      if (week) {
        week.count += 1;
        if (entry.type === 'item') {
          week.net += entry.amount;
        } else {
          week.net -= entry.amount;
        }
      }
    });

    // Only return weeks with entries
    return weeks.filter((w) => w.count > 0);
  }, [entries, monthKey, monthData]);

  const handleDownloadMonthPdf = async () => {
    if (!monthRange) return;
    try {
      setIsDownloadingPdf(true);
      const fileUri = await downloadCustomerPortalPdf({
        startDate: monthRange.start,
        endDate: monthRange.end,
        customerName: customerName || 'Gahak',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${monthLabel} Statement`,
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
        data={entries}
        keyExtractor={(item, index) => item._id || String(index)}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Month Summary Card */}
            <Card style={styles.summaryCard}>
              <Text style={styles.monthHeaderTitle}>{monthLabel || 'Mahana Hisab'}</Text>
              <Text style={styles.shopSubText}>
                🏪 {shopName || 'Karobar Hisab'} • {customerName || 'Gahak'} ka hisab
              </Text>

              {/* 3 Metrics: Pichla Baqaya, Is Mahine Ka Net, Aakhri Baqaya */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Pichla Baqaya</Text>
                  <Text style={styles.statBoxValue}>
                    Rs. {(monthData?.openingBalance || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Is Mahine Ka Net</Text>
                  <Text
                    style={[
                      styles.statBoxValue,
                      { color: monthData?.monthNet > 0 ? colors.danger : colors.success },
                    ]}
                  >
                    {monthData?.monthNet > 0 ? '+' : ''}
                    Rs. {(monthData?.monthNet || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Aakhri Baqaya</Text>
                  <Text
                    style={[
                      styles.statBoxValue,
                      {
                        fontWeight: 'bold',
                        color: monthData?.closingBalance > 0 ? colors.danger : colors.success,
                      },
                    ]}
                  >
                    Rs. {(monthData?.closingBalance || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Big PDF Button */}
              <TouchableOpacity
                style={styles.bigPdfButton}
                onPress={handleDownloadMonthPdf}
                disabled={isDownloadingPdf}
                activeOpacity={0.85}
              >
                {isDownloadingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.bigPdfIcon}>📄</Text>
                    <Text style={styles.bigPdfText}>
                      Is Mahine Ka PDF Download Karein
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>

            {/* Weekly Breakdown Cards (Thursday to Wednesday) */}
            {weeklySummaries.length > 0 ? (
              <View style={styles.weeklySection}>
                <Text style={styles.sectionHeading}>📅 Haftawar Hisab (Thursday se Wednesday)</Text>
                <Text style={styles.sectionSubtext}>
                  Kisi bhi hafte ka hisab alag se dekhne ke liye tap karein:
                </Text>

                <View style={styles.weeklyCardsGrid}>
                  {weeklySummaries.map((w) => (
                    <TouchableOpacity
                      key={w.weekNum}
                      style={styles.weekCardTouchable}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('CustomerPortalWeekDetail', {
                          monthKey,
                          monthLabel: monthData?.monthLabel,
                          weekLabel: w.label,
                          dateRange: w.dateRange,
                          weekNum: w.weekNum,
                          startDay: w.startDay,
                          endDay: w.endDay,
                          initialMonthData: monthData,
                          customerName,
                          shopName,
                        })
                      }
                    >
                      <Card style={styles.weekCard}>
                        <View style={styles.weekCardHeader}>
                          <Text style={styles.weekDateRangeMain}>{w.dateRange}</Text>
                          <View style={styles.weekBadge}>
                            <Text style={styles.weekBadgeText}>{w.label}</Text>
                          </View>
                        </View>

                        <View style={styles.weekCardBody}>
                          <Text
                            style={[
                              styles.weekNetText,
                              { color: w.net > 0 ? colors.danger : colors.success },
                            ]}
                          >
                            {w.net > 0
                              ? `+ Rs. ${w.net.toLocaleString()} liya`
                              : w.net < 0
                              ? `- Rs. ${Math.abs(w.net).toLocaleString()} diya`
                              : 'Barabar'}
                          </Text>
                          <Text style={styles.weekEntriesCount}>
                            {w.count} {w.count === 1 ? 'cheez' : 'cheezein'}
                          </Text>
                        </View>

                        <View style={styles.weekCardFooter}>
                          <Text style={styles.weekCardArrowText}>Hafte Ka Hisab Kholein →</Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Day-Wise Transactions Section Header */}
            <View style={styles.entriesSectionHeader}>
              <Text style={styles.sectionHeading}>📝 Is Mahine Ki Mukammal Tafseelat</Text>
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
            title="Is Mahine Koi Entry Nahi"
            description="Is mahine koi kharedari ya payment darj nahi hui."
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
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  monthHeaderTitle: {
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
  // Weekly Breakdown Section
  weeklySection: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  weeklyCardsGrid: {
    gap: spacing.sm,
  },
  weekCardTouchable: {
    marginBottom: 2,
  },
  weekCard: {
    ...cardStyles,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 110, 86, 0.15)',
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  weekDateRangeMain: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  weekBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weekBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  weekCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  weekNetText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  weekEntriesCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  weekCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F0EC',
    paddingTop: 6,
    alignItems: 'flex-end',
  },
  weekCardArrowText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  // Entries Section
  entriesSectionHeader: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
