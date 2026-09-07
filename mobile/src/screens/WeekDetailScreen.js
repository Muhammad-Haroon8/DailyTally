// src/screens/WeekDetailScreen.js
// Weekly Detail Screen:
// - Header with Week Label & Date Range (e.g. "Week 1 (1 - 7 Sep 2026)")
// - Top overview card: Total Udhaar, Total Wasool, and Weekly Net
// - Day-wise transaction cards within this week
// - Entry details with vertical layout (flexDirection: column)
// - Tap to edit / delete entries

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import UpdatingIndicator from '../components/UpdatingIndicator';
import SendReportModal from '../components/SendReportModal';
import EntryTypeFilter from '../components/EntryTypeFilter';
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByCustomer, deleteEntry } from '../api/entryApi';
import { getCachedCustomerDetail } from '../storage/localCache';

export default function WeekDetailScreen({ route, navigation }) {
  const {
    customerId,
    customerName,
    monthKey,
    monthLabel,
    weekNum,
    startDay: paramStartDay,
    endDay: paramEndDay,
    weekLabel,
    dateRange,
    initialMonthData,
  } = route.params || {};

  // Defensive week boundaries fallback if startDay/endDay were somehow not passed
  const { startDay, endDay } = useMemo(() => {
    if (paramStartDay && paramEndDay) {
      return { startDay: Number(paramStartDay), endDay: Number(paramEndDay) };
    }
    const defaultWeeks = {
      1: { startDay: 1, endDay: 7 },
      2: { startDay: 8, endDay: 14 },
      3: { startDay: 15, endDay: 21 },
      4: { startDay: 22, endDay: 28 },
      5: { startDay: 29, endDay: 31 },
    };
    return defaultWeeks[weekNum] || { startDay: 1, endDay: 31 };
  }, [paramStartDay, paramEndDay, weekNum]);

  // Initial calculation from initialMonthData if provided
  const initialEntries = useMemo(() => {
    if (initialMonthData && initialMonthData.entries) {
      return initialMonthData.entries.filter((entry) => {
        const d = new Date(entry.entryDate);
        const day = d.getDate();
        return day >= startDay && day <= endDay;
      });
    }
    return [];
  }, [initialMonthData, startDay, endDay]);

  const [entries, setEntries] = useState(initialEntries);
  const [isLoading, setIsLoading] = useState(initialEntries.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [entryTypeFilter, setEntryTypeFilter] = useState('all'); // 'all' | 'item' | 'payment'
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Compute exact date range for this opened week
  const weekRange = useMemo(() => {
    if (!monthKey || !startDay || !endDay) return null;
    const start = `${monthKey}-${String(startDay).padStart(2, '0')}`;
    const end = `${monthKey}-${String(endDay).padStart(2, '0')}`;
    return {
      start,
      end,
      title: `${weekLabel || 'Week'} (${dateRange || ''}) Ka Hisab`,
    };
  }, [monthKey, startDay, endDay, weekLabel, dateRange]);

  const loadWeekData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        // Fast local cache read first if no entries displayed yet
        const cached = await getCachedCustomerDetail(customerId);
        const targetMonth = (cached?.months || []).find((m) => m.monthKey === monthKey);
        if (targetMonth && targetMonth.entries) {
          const weekEntries = targetMonth.entries.filter((entry) => {
            const d = new Date(entry.entryDate);
            const day = d.getDate();
            return day >= startDay && day <= endDay;
          });
          setEntries(weekEntries);
          setIsLoading(false);
          setIsBackgroundUpdating(true);
        } else if (entries.length === 0) {
          setIsLoading(true);
        } else {
          setIsBackgroundUpdating(true);
        }
      }
      setErrorMessage('');

      const data = await getEntriesByCustomer(customerId);
      const targetMonth = (data.months || []).find((m) => m.monthKey === monthKey);

      if (targetMonth && targetMonth.entries) {
        // Filter entries that fall into this calendar week
        const weekEntries = targetMonth.entries.filter((entry) => {
          const d = new Date(entry.entryDate);
          const day = d.getDate();
          return day >= startDay && day <= endDay;
        });
        setEntries(weekEntries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      if (entries.length === 0) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsBackgroundUpdating(false);
    }
  }, [customerId, monthKey, startDay, endDay, entries.length]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadWeekData();
    });
    return unsubscribe;
  }, [navigation, loadWeekData]);

  // Set navigation header title
  useEffect(() => {
    navigation.setOptions({
      title: `${weekLabel} (${dateRange})`,
    });
  }, [weekLabel, dateRange, navigation]);

  // Compute Weekly Totals
  const weeklyTotals = useMemo(() => {
    let totalUdhaar = 0;
    let totalWasool = 0;

    entries.forEach((e) => {
      if (e.type === 'item') {
        totalUdhaar += e.amount;
      } else {
        totalWasool += e.amount;
      }
    });

    const net = totalUdhaar - totalWasool;

    return {
      totalUdhaar,
      totalWasool,
      net,
      count: entries.length,
    };
  }, [entries]);

  // Filter counts
  const filterCounts = useMemo(() => {
    let item = 0;
    let payment = 0;
    entries.forEach((e) => {
      if (e.type === 'item') item++;
      else if (e.type === 'payment') payment++;
    });
    return { all: entries.length, item, payment };
  }, [entries]);

  // Group entries into day-wise sections (newest date first) with client-side filter applied
  const dayWiseGroups = useMemo(() => {
    const groups = {};

    entries.forEach((entry) => {
      // Apply client-side entry type filter
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
  }, [entries, entryTypeFilter]);

  const handleEntryActions = (entry) => {
    Alert.alert(
      entry.type === 'item' ? 'Item Entry' : 'Wasool Entry',
      `${entry.type === 'item' ? `${entry.quantity} ${entry.itemName} @ Rs.${entry.rate}` : `Wasool: Rs. ${entry.amount}`}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            if (entry.type === 'item') {
              navigation.navigate('AddItemEntry', {
                customerId,
                customerName,
                entry,
              });
            } else {
              navigation.navigate('AddPaymentEntry', {
                customerId,
                customerName,
                entry,
              });
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const entryDesc =
              entry.type === 'item'
                ? `Rs. ${entry.amount} (${entry.quantity} ${entry.itemName} Udhaar)`
                : `Rs. ${entry.amount} Wasool`;

            Alert.alert(
              'Confirm Delete',
              `Kya aap waqai '${entryDesc}' ki entry delete karna chahte hain?`,
              [
                { text: 'Nahi', style: 'cancel' },
                {
                  text: 'Haan, Delete Karein',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteEntry(entry._id);
                      loadWeekData();
                    } catch (err) {
                      Alert.alert('Error', err.message);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.topSection}>
      {isBackgroundUpdating ? (
        <UpdatingIndicator message="Taza hafte ka hisab update ho raha hai..." />
      ) : null}

      {/* Weekly Stats Card */}
      <Card style={styles.weekOverviewCard}>
        <View style={styles.overviewTopRow}>
          <View style={styles.customerNameWrap}>
            <Text style={styles.overviewCustomerName}>{customerName || 'Gahak'}</Text>
            <Text style={styles.overviewWeekSubtitle}>{weekLabel} • {dateRange}</Text>
          </View>
          <View style={styles.topRightWrap}>
            <TouchableOpacity
              style={styles.weekReportButton}
              onPress={() => setIsReportModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.weekReportButtonText}>📄 Report</Text>
            </TouchableOpacity>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{weeklyTotals.count} {weeklyTotals.count === 1 ? 'entry' : 'entries'}</Text>
            </View>
          </View>
        </View>

        {/* Weekly Financial Overview Stats: Is Hafte Ka Udhaar, Wasool in top row & Net below */}
        <View style={styles.financialSummaryCard}>
          <View style={styles.financialColsRow}>
            {/* Is Hafte Ka Udhaar */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Is Hafte Ka Udhaar</Text>
              <Text style={[styles.financialValue, styles.textDebit]}>
                Rs. {weeklyTotals.totalUdhaar.toLocaleString()}
              </Text>
            </View>

            <View style={styles.financialDivider} />

            {/* Is Hafte Ka Wasool */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Is Hafte Ka Wasool</Text>
              <Text style={[styles.financialValue, styles.textCredit]}>
                Rs. {weeklyTotals.totalWasool.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Is Hafte Ka Net Highlight Bar */}
          <View style={styles.balanceHighlightBar}>
            <Text style={styles.balanceHighlightLabel}>Is Hafte Ka Net:</Text>
            <Text
              style={[
                styles.balanceHighlightValue,
                weeklyTotals.net > 0
                  ? styles.balanceDanger
                  : weeklyTotals.net < 0
                    ? styles.balanceCredit
                    : styles.balanceZero,
              ]}
            >
              {weeklyTotals.net >= 0
                ? `+Rs. ${weeklyTotals.net.toLocaleString()}`
                : `-Rs. ${Math.abs(weeklyTotals.net).toLocaleString()}`}
            </Text>
          </View>
        </View>
      </Card>

      {/* Filter Header and Chips */}
      <EntryTypeFilter
        filter={entryTypeFilter}
        onChangeFilter={(f) => setEntryTypeFilter(f)}
        isOpen={isFilterOpen}
        onToggleOpen={() => setIsFilterOpen((prev) => !prev)}
        counts={filterCounts}
        title="📅 Is Hafte Ke Din-Ba-Din Entries"
      />
    </View>
  );

  const renderDayCard = ({ item: daySection }) => (
    <Card style={styles.dateCard}>
      {/* Date Header */}
      <View style={styles.dateCardHeader}>
        <View style={styles.dateRow}>
          <Text style={styles.calendarIcon}>📅</Text>
          <Text style={styles.dateText}>{daySection.dateFormatted}</Text>
        </View>
        <Text
          style={[
            styles.dayTotalText,
            daySection.dayTotal > 0
              ? styles.dayTotalDebit
              : daySection.dayTotal < 0
                ? styles.dayTotalCredit
                : styles.dayTotalNeutral,
          ]}
        >
          Day net: {daySection.dayTotal >= 0 ? `Rs. ${daySection.dayTotal.toLocaleString()}` : `- Rs. ${Math.abs(daySection.dayTotal).toLocaleString()}`}
        </Text>
      </View>

      {/* Entry Rows in Column Layout */}
      {daySection.items.map((entry) => {
        const isItem = entry.type === 'item';
        return (
          <TouchableOpacity
            key={entry._id}
            style={styles.entryRow}
            onPress={() => handleEntryActions(entry)}
            activeOpacity={0.7}
          >
            <View style={styles.entryLeftCol}>
              <View
                style={[
                  styles.entryTypePill,
                  isItem ? styles.itemPill : styles.paymentPill,
                ]}
              >
                <Text style={styles.pillIcon}>{isItem ? '📦' : '💵'}</Text>
                <Text
                  style={[
                    styles.entryTypeText,
                    isItem ? styles.itemPillText : styles.paymentPillText,
                  ]}
                >
                  {isItem ? 'UDHAAR' : 'WASOOL'}
                </Text>
              </View>

              <View style={styles.entryDetailsColumn}>
                <View style={styles.itemNameRow}>
                  <Text style={styles.entryItemNameText}>
                    {isItem ? entry.itemName : 'Wasool Raqam'}
                  </Text>
                  {(entry.isLocal || (typeof entry._id === 'string' && entry._id.startsWith('local-'))) && (
                    <View style={styles.queuedBadge}>
                      <Text style={styles.queuedBadgeText}>⏳ Queued</Text>
                    </View>
                  )}
                </View>
                {isItem ? (
                  <Text style={styles.entryQtyRateText}>
                    Qty: {entry.quantity}  ×  Rate: Rs. {entry.rate}
                  </Text>
                ) : null}
                {entry.note ? (
                  <Text style={styles.entryNoteText}>📝 {entry.note}</Text>
                ) : null}
                {entry.entryTime ? (
                  <Text style={styles.entryTimeText}>⏰ {entry.entryTime}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.entryRightCol}>
              <Text
                style={[
                  styles.entryAmountText,
                  isItem ? styles.itemAmount : styles.paymentAmount,
                ]}
              >
                {isItem ? `Rs. ${entry.amount.toLocaleString()}` : `+ Rs. ${entry.amount.toLocaleString()}`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <LoadingSpinner message="Loading hafte ka hisab..." />
      ) : (
        <FlatList
          data={dayWiseGroups}
          keyExtractor={(item) => item.dateKey}
          ListHeaderComponent={renderHeader}
          renderItem={renderDayCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadWeekData(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            entryTypeFilter !== 'all' ? (
              <EmptyState
                icon="🔍"
                title="Is filter ke mutabiq koi entry nahi mili"
                subtitle={`Is hafte koi ${entryTypeFilter === 'item' ? 'Udhaar' : 'Wasool'} entry moujood nahi hai.`}
                actionLabel="Sab Entries Dekhein"
                onAction={() => setEntryTypeFilter('all')}
              />
            ) : (
              <EmptyState
                icon="📝"
                title="Is hafte koi entry nahi hai"
                subtitle="Pichle screen par ja kar entry add karein."
              />
            )
          }
        />
      )}

      {/* Scoped Weekly Report Modal */}
      <SendReportModal
        visible={isReportModalVisible}
        onClose={() => setIsReportModalVisible(false)}
        customerId={customerId}
        customerName={customerName}
        fixedDateRange={weekRange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 36,
  },
  topSection: {
    marginBottom: spacing.sm,
  },
  weekOverviewCard: {
    padding: spacing.lg,
    backgroundColor: colors.cardBackground,
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  customerNameWrap: {
    flex: 1,
    marginRight: 8,
  },
  topRightWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  weekReportButton: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  weekReportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  overviewCustomerName: {
    ...typography.h2,
    color: colors.primary,
  },
  overviewWeekSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  financialSummaryCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  financialColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  financialCol: {
    flex: 1,
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  financialValue: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  financialDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  balanceHighlightBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: 4,
  },
  balanceHighlightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  balanceHighlightValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceDanger: {
    color: colors.danger,
  },
  balanceCredit: {
    color: colors.success,
  },
  balanceZero: {
    color: colors.textPrimary,
  },
  textDebit: {
    color: colors.danger,
  },
  textCredit: {
    color: colors.success,
  },
  textNeutral: {
    color: colors.textSecondary,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  // Date Card Styles
  dateCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateCardHeader: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  dayTotalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayTotalDebit: {
    color: colors.danger,
  },
  dayTotalCredit: {
    color: colors.success,
  },
  dayTotalNeutral: {
    color: colors.textSecondary,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  entryLeftCol: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  entryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  itemPill: {
    backgroundColor: colors.dangerLight,
  },
  paymentPill: {
    backgroundColor: colors.successLight,
  },
  pillIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  entryTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemPillText: {
    color: colors.danger,
  },
  paymentPillText: {
    color: colors.success,
  },
  entryDetailsColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  entryItemNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  entryQtyRateText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  entryNoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  entryTimeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  entryRightCol: {
    paddingLeft: spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  entryAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemAmount: {
    color: colors.danger,
  },
  paymentAmount: {
    color: colors.success,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  queuedBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  queuedBadgeText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '700',
  },
});
