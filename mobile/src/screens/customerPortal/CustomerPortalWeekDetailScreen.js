// src/screens/customerPortal/CustomerPortalWeekDetailScreen.js
// Customer Self-Service Portal - Read-Only Week Detail Screen
// Weekly summary totals, daily entries list, and week PDF download

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
import EntryTypeFilter from '../../components/EntryTypeFilter';
import { colors, typography, spacing, cardStyles } from '../../constants/theme';
import { downloadCustomerPortalPdf } from '../../api/customerPortalApi';

export default function CustomerPortalWeekDetailScreen({ route }) {
  const {
    monthKey,
    monthLabel,
    weekNum,
    weekLabel,
    dateRange,
    startDay,
    endDay,
    initialMonthData,
    customerName,
    shopName,
  } = route.params || {};

  const [entryTypeFilter, setEntryTypeFilter] = useState('all'); // 'all' | 'item' | 'payment'
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  // Filter counts
  const filterCounts = useMemo(() => {
    let item = 0;
    let payment = 0;
    weekEntries.forEach((e) => {
      if (e.type === 'item') item++;
      else if (e.type === 'payment') payment++;
    });
    return { all: weekEntries.length, item, payment };
  }, [weekEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (entryTypeFilter === 'all') return weekEntries;
    return weekEntries.filter((e) => e.type === entryTypeFilter);
  }, [weekEntries, entryTypeFilter]);

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
          dialogTitle: `${weekLabel} Statement`,
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
        data={filteredEntries}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Week Summary Card */}
            <Card style={styles.summaryCard}>
              <View style={styles.weekTitleRow}>
                <View>
                  <Text style={styles.weekHeaderTitle}>
                    {weekLabel || `Week ${weekNum}`} ({dateRange})
                  </Text>
                  <Text style={styles.shopSubText}>
                    {monthLabel} • 🏪 {shopName || 'Karobar Hisab'}
                  </Text>
                </View>

                {/* Week PDF Button */}
                <TouchableOpacity
                  style={styles.pdfBadge}
                  onPress={handleDownloadWeekPdf}
                  disabled={isDownloadingPdf}
                  activeOpacity={0.8}
                >
                  {isDownloadingPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.pdfBadgeText}>📄 PDF</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* 3 Metrics: Udhaar, Wasool, Net */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Is Hafte Ka Udhaar</Text>
                  <Text style={[styles.statBoxValue, { color: colors.accent }]}>
                    Rs. {weekTotals.udhaar.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Is Hafte Wasool</Text>
                  <Text style={[styles.statBoxValue, { color: colors.success }]}>
                    Rs. {weekTotals.wasool.toLocaleString()}
                  </Text>
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
                </View>
              </View>
            </Card>

            {/* Filter Section */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionHeading}>📋 Is Hafte Ki Transactions</Text>
              <EntryTypeFilter
                selectedFilter={entryTypeFilter}
                onSelectFilter={setEntryTypeFilter}
                counts={filterCounts}
              />
            </View>
          </View>
        }
        renderItem={({ item: entry }) => {
          const isUdhaar = entry.type === 'item';
          const d = new Date(entry.entryDate);
          const dateFormatted = d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });

          return (
            <Card
              style={[
                styles.entryCard,
                isUdhaar ? styles.entryCardUdhaar : styles.entryCardWasool,
              ]}
            >
              <View style={styles.entryRow}>
                <View style={styles.entryMainInfo}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor: isUdhaar
                            ? colors.accentLight
                            : colors.successLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: isUdhaar ? colors.accent : colors.success },
                        ]}
                      >
                        {isUdhaar ? '🛒 UDHAAR' : '💰 WASOOL'}
                      </Text>
                    </View>

                    <Text style={styles.dateText}>🗓️ {dateFormatted}</Text>
                    {entry.entryTime ? (
                      <Text style={styles.timeText}> • 🕒 {entry.entryTime}</Text>
                    ) : null}
                  </View>

                  {isUdhaar ? (
                    <Text style={styles.itemNameText}>{entry.itemName}</Text>
                  ) : (
                    <Text style={styles.paymentText}>Cash Payment Wasool</Text>
                  )}

                  {isUdhaar && entry.quantity && entry.rate ? (
                    <Text style={styles.rateCalculation}>
                      {entry.quantity} x Rs. {entry.rate} = Rs. {entry.amount.toLocaleString()}
                    </Text>
                  ) : null}

                  {entry.note ? (
                    <Text style={styles.noteText}>📝 Note: {entry.note}</Text>
                  ) : null}
                </View>

                <View style={styles.entryAmountCol}>
                  <Text
                    style={[
                      styles.amountText,
                      { color: isUdhaar ? colors.accent : colors.success },
                    ]}
                  >
                    {isUdhaar ? '+' : '-'} Rs. {entry.amount.toLocaleString()}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="Is Filter Me Koi Entry Nahi"
            description="Is hafte ke andar filter ke mutabiq koi transaction nahi mili."
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
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  weekTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  shopSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pdfBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pdfBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: colors.border,
  },
  statBoxLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statBoxValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  entryCard: {
    ...cardStyles,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  entryCardUdhaar: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  entryCardWasool: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryMainInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 2,
  },
  rateCalculation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  entryAmountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
