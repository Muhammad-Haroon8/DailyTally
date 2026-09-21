// src/screens/customerPortal/CustomerPortalMonthDetailScreen.js
// Customer Self-Service Portal - Read-Only Month Detail Screen
// Month overview, weekly cards, day-wise transaction list, and month PDF download

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

export default function CustomerPortalMonthDetailScreen({ route, navigation }) {
  const { monthKey, monthLabel, monthData, customerName, shopName } = route.params || {};

  const [entryTypeFilter, setEntryTypeFilter] = useState('all'); // 'all' | 'item' | 'payment'
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

  // Compute weeks breakdown (Week 1 to Week 5)
  const weeklyCards = useMemo(() => {
    if (!monthData || !monthData.entries) return [];

    const weeks = [
      { weekNum: 1, startDay: 1, endDay: 7, label: 'Week 1', count: 0, net: 0, udhaar: 0, wasool: 0 },
      { weekNum: 2, startDay: 8, endDay: 14, label: 'Week 2', count: 0, net: 0, udhaar: 0, wasool: 0 },
      { weekNum: 3, startDay: 15, endDay: 21, label: 'Week 3', count: 0, net: 0, udhaar: 0, wasool: 0 },
      { weekNum: 4, startDay: 22, endDay: 28, label: 'Week 4', count: 0, net: 0, udhaar: 0, wasool: 0 },
      { weekNum: 5, startDay: 29, endDay: 31, label: 'Week 5', count: 0, net: 0, udhaar: 0, wasool: 0 },
    ];

    const monthShort = monthLabel ? monthLabel.split(' ')[0].slice(0, 3) : '';

    monthData.entries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      const day = d.getDate();

      const week = weeks.find((w) => day >= w.startDay && day <= w.endDay);
      if (week) {
        week.count += 1;
        if (entry.type === 'item') {
          week.net += entry.amount;
          week.udhaar += entry.amount;
        } else {
          week.net -= entry.amount;
          week.wasool += entry.amount;
        }
      }
    });

    return weeks
      .filter((w) => w.count > 0)
      .map((w) => ({
        ...w,
        dateRange: `${w.startDay} - ${w.endDay} ${monthShort}`,
      }));
  }, [monthData, monthLabel]);

  // Group entries by date (newest date first)
  const dayWiseGroups = useMemo(() => {
    if (!monthData || !monthData.entries) return [];

    const groups = {};

    monthData.entries.forEach((entry) => {
      if (entryTypeFilter !== 'all' && entry.type !== entryTypeFilter) {
        return;
      }

      const dateObj = new Date(entry.entryDate);
      const dateKey = dateObj.toISOString().split('T')[0];

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dateFormatted: dateObj.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          items: [],
          dayTotal: 0,
        };
      }

      groups[dateKey].items.push(entry);

      if (entry.type === 'item') {
        groups[dateKey].dayTotal += entry.amount;
      } else {
        groups[dateKey].dayTotal -= entry.amount;
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.dateKey) - new Date(a.dateKey)
    );
  }, [monthData, entryTypeFilter]);

  const filterCounts = useMemo(() => {
    if (!monthData || !monthData.entries) return { all: 0, item: 0, payment: 0 };
    let item = 0;
    let payment = 0;
    monthData.entries.forEach((e) => {
      if (e.type === 'item') item++;
      else if (e.type === 'payment') payment++;
    });
    return { all: monthData.entries.length, item, payment };
  }, [monthData]);

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
        data={dayWiseGroups}
        keyExtractor={(item) => item.dateKey}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Top Month Summary Card */}
            <Card style={styles.summaryCard}>
              <View style={styles.monthTitleRow}>
                <View>
                  <Text style={styles.monthHeaderTitle}>{monthLabel || 'Mahana Hisab'}</Text>
                  <Text style={styles.shopSubText}>🏪 {shopName || 'Karobar Hisab'}</Text>
                </View>

                {/* Month PDF Button */}
                <TouchableOpacity
                  style={styles.pdfBadge}
                  onPress={handleDownloadMonthPdf}
                  disabled={isDownloadingPdf}
                  activeOpacity={0.8}
                >
                  {isDownloadingPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.pdfBadgeText}>📄 PDF Download</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* 3 Metrics: Opening, Net, Closing */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Pichla Baqaya</Text>
                  <Text style={styles.statBoxValue}>
                    Rs. {(monthData?.openingBalance || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Mahine Ka Net</Text>
                  <Text
                    style={[
                      styles.statBoxValue,
                      { color: monthData?.monthNet > 0 ? colors.accent : colors.success },
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
            </Card>

            {/* Weekly Summary Cards Section */}
            {weeklyCards.length > 0 ? (
              <View style={styles.weeksSection}>
                <Text style={styles.sectionHeading}>📅 Haftawar Hisab (Weeks Breakdown)</Text>
                <Text style={styles.sectionHint}>
                  Kisi bhi hafte par tap karke us hafte ki rozana transactions dekhein
                </Text>

                <View style={styles.weeklyList}>
                  {weeklyCards.map((week) => (
                    <TouchableOpacity
                      key={week.weekNum}
                      activeOpacity={0.85}
                      style={styles.weekTouchable}
                      onPress={() =>
                        navigation.navigate('CustomerPortalWeekDetail', {
                          monthKey,
                          monthLabel,
                          weekNum: week.weekNum,
                          weekLabel: week.label,
                          dateRange: week.dateRange,
                          startDay: week.startDay,
                          endDay: week.endDay,
                          initialMonthData: monthData,
                          customerName,
                          shopName,
                        })
                      }
                    >
                      <Card style={styles.weekCard}>
                        <View style={styles.weekTopRow}>
                          <Text style={styles.weekTitleText}>{week.label}</Text>
                          <Text style={styles.weekDateBadge}>{week.dateRange}</Text>
                        </View>

                        <View style={styles.weekBottomRow}>
                          <Text style={styles.weekCountText}>
                            {week.count} transactions
                          </Text>
                          <Text
                            style={[
                              styles.weekNetText,
                              { color: week.net > 0 ? colors.accent : colors.success },
                            ]}
                          >
                            {week.net > 0 ? '+' : ''}
                            Rs. {week.net.toLocaleString()}
                          </Text>
                          <Text style={styles.weekArrow}>→</Text>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Filter Chips */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionHeading}>📋 Rozana Ki Tafseel (Daily Entries)</Text>
              <EntryTypeFilter
                selectedFilter={entryTypeFilter}
                onSelectFilter={setEntryTypeFilter}
                counts={filterCounts}
              />
            </View>
          </View>
        }
        renderItem={({ item: dayGroup }) => (
          <View style={styles.dayGroupContainer}>
            {/* Day Header Banner */}
            <View style={styles.dayHeader}>
              <Text style={styles.dayDateText}>🗓️ {dayGroup.dateFormatted}</Text>
              <Text
                style={[
                  styles.dayNetText,
                  { color: dayGroup.dayTotal > 0 ? colors.accent : colors.success },
                ]}
              >
                Net: {dayGroup.dayTotal > 0 ? '+' : ''}
                Rs. {dayGroup.dayTotal.toLocaleString()}
              </Text>
            </View>

            {/* Day Entries */}
            {dayGroup.items.map((entry) => {
              const isUdhaar = entry.type === 'item';
              return (
                <Card
                  key={entry._id}
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
                            {isUdhaar ? '🛒 UDHAAR (ITEM)' : '💰 WASOOL RAQAM'}
                          </Text>
                        </View>

                        {entry.entryTime ? (
                          <Text style={styles.timeText}>🕒 {entry.entryTime}</Text>
                        ) : null}
                      </View>

                      {isUdhaar ? (
                        <Text style={styles.itemNameText}>{entry.itemName}</Text>
                      ) : null}

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
            })}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="Is Filter Me Koi Entry Nahi Hai"
            description="Selected filter ke mutabiq is mahine koi transaction nahi mili."
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
  monthTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthHeaderTitle: {
    fontSize: 20,
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
    paddingVertical: 7,
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
  },
  statBoxValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  weeksSection: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  weeklyList: {
    marginTop: 4,
  },
  weekTouchable: {
    marginBottom: spacing.sm,
  },
  weekCard: {
    ...cardStyles,
    padding: spacing.md,
  },
  weekTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  weekTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  weekDateBadge: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  weekBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  weekCountText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  weekNetText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  weekArrow: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  dayGroupContainer: {
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  dayDateText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  dayNetText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  entryCard: {
    ...cardStyles,
    padding: spacing.md,
    marginBottom: spacing.xs + 2,
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
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
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
