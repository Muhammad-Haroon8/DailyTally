// src/screens/MonthDetailScreen.js
// Month Detail Screen:
// - Header with Month Label (e.g. "September 2026")
// - Opening balance carried forward banner (↳ Pichla baqaya)
// - Weekly summary cards (Week 1, Week 2, etc.) with date range and net total
// - Day-wise transaction cards (most recent date first)
// - Entry row layout in column direction (prevents cramped text)
// - Edit/Delete entry actions

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
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import SendReportModal from '../components/SendReportModal';
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByCustomer, deleteEntry } from '../api/entryApi';

export default function MonthDetailScreen({ route, navigation }) {
  const { customerId, customerName, monthKey, initialMonthData } = route.params || {};

  const [monthData, setMonthData] = useState(initialMonthData || null);
  const [isLoading, setIsLoading] = useState(!initialMonthData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  // Compute exact date range for this opened month
  const monthRange = useMemo(() => {
    const key = monthKey || monthData?.monthKey;
    if (!key) return null;
    const [y, m] = key.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      start: `${key}-01`,
      end: `${key}-${String(lastDay).padStart(2, '0')}`,
      title: `${monthData?.monthLabel || key} Ka Hisab`,
    };
  }, [monthKey, monthData]);

  const loadMonthData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!monthData) {
        setIsLoading(true);
      }
      setErrorMessage('');
      const data = await getEntriesByCustomer(customerId);
      const targetMonth = (data.months || []).find((m) => m.monthKey === monthKey);
      if (targetMonth) {
        setMonthData(targetMonth);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [customerId, monthKey, monthData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMonthData();
    });
    return unsubscribe;
  }, [navigation, loadMonthData]);

  // Set header title to Month Label
  useEffect(() => {
    if (monthData?.monthLabel) {
      navigation.setOptions({
        title: monthData.monthLabel,
      });
    }
  }, [monthData?.monthLabel, navigation]);

  // 1. Group entries by Calendar Weeks (Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-end)
  const weeklySummaries = useMemo(() => {
    if (!monthData || !monthData.entries || monthData.entries.length === 0) return [];

    const weeks = [
      { weekNum: 1, startDay: 1, endDay: 7, label: 'Week 1', net: 0, count: 0 },
      { weekNum: 2, startDay: 8, endDay: 14, label: 'Week 2', net: 0, count: 0 },
      { weekNum: 3, startDay: 15, endDay: 21, label: 'Week 3', net: 0, count: 0 },
      { weekNum: 4, startDay: 22, endDay: 28, label: 'Week 4', net: 0, count: 0 },
      { weekNum: 5, startDay: 29, endDay: 31, label: 'Week 5', net: 0, count: 0 },
    ];

    // Short month name (e.g. "Sep")
    const monthShort = monthData.monthLabel ? monthData.monthLabel.split(' ')[0].slice(0, 3) : '';

    monthData.entries.forEach((entry) => {
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

    // Skip weeks with zero activity
    return weeks
      .filter((w) => w.count > 0)
      .map((w) => ({
        ...w,
        dateRange: `${w.startDay} - ${w.endDay} ${monthShort}`,
      }));
  }, [monthData]);

  // 2. Group entries into Day-wise cards (newest date first)
  const dayWiseGroups = useMemo(() => {
    if (!monthData || !monthData.entries) return [];

    const groups = {};

    monthData.entries.forEach((entry) => {
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
  }, [monthData]);

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
                      loadMonthData();
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
      {/* Month Overview Card */}
      <Card style={styles.monthOverviewCard}>
        <View style={styles.overviewTopRow}>
          <View style={styles.customerNameWrap}>
            <Text style={styles.overviewCustomerName}>{customerName || 'Gahak'}</Text>
            <Text style={styles.overviewMonthLabel}>{monthData?.monthLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.monthReportButton}
            onPress={() => setIsReportModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.monthReportButtonText}>📄 Report Bhejein</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.overviewStatsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Month Net Hisab</Text>
            <Text
              style={[
                styles.statValue,
                (monthData?.monthNet || 0) > 0 ? styles.statValueDebit : styles.statValueCredit,
              ]}
            >
              {(monthData?.monthNet || 0) >= 0 ? `+Rs. ${(monthData?.monthNet || 0).toLocaleString()}` : `-Rs. ${Math.abs(monthData?.monthNet || 0).toLocaleString()}`}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Closing Balance</Text>
            <Text style={[styles.statValue, styles.statValuePrimary]}>
              Rs. {(monthData?.closingBalance || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Action Buttons: Add Item vs Wasool Raqam */}
        <View style={styles.buttonsRow}>
          <PrimaryButton
            title="Add Item (Udhaar)"
            icon="📦"
            variant="accent"
            onPress={() =>
              navigation.navigate('AddItemEntry', {
                customerId,
                customerName,
              })
            }
            style={styles.actionBtn}
          />

          <PrimaryButton
            title="Wasool Raqam"
            icon="💵"
            variant="success"
            onPress={() =>
              navigation.navigate('AddPaymentEntry', {
                customerId,
                customerName,
              })
            }
            style={styles.actionBtn}
          />
        </View>
      </Card>

      {/* Opening Balance Carried Forward Line (if opening balance is not 0) */}
      {monthData && monthData.openingBalance !== 0 ? (
        <View style={styles.openingBalanceBanner}>
          <View style={styles.openingBalanceLeft}>
            <Text style={styles.openingArrowIcon}>↳</Text>
            <Text style={styles.openingLabelText}>Pichla baqaya (Opening Carried Forward):</Text>
          </View>
          <Text style={styles.openingBalanceAmount}>
            Rs. {monthData.openingBalance.toLocaleString()}
          </Text>
        </View>
      ) : null}

      {/* Weekly Summary Cards Section */}
      {weeklySummaries.length > 0 ? (
        <View style={styles.weeklySection}>
          <Text style={styles.sectionHeaderTitle}>📊 Weekly Summary</Text>
          <View style={styles.weeklyCardsGrid}>
            {weeklySummaries.map((w) => (
              <TouchableOpacity
                key={w.weekNum}
                style={styles.weekCardTouchable}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('WeekDetail', {
                    customerId,
                    customerName,
                    monthKey,
                    monthLabel: monthData?.monthLabel,
                    weekNum: w.weekNum,
                    startDay: w.startDay,
                    endDay: w.endDay,
                    weekLabel: w.label,
                    dateRange: w.dateRange,
                  })
                }
              >
                <Card style={styles.weekCard}>
                  <View style={styles.weekCardTop}>
                    <Text style={styles.weekLabel}>{w.label}</Text>
                    <Text style={styles.weekDateRange}>{w.dateRange}</Text>
                  </View>
                  <Text
                    style={[
                      styles.weekNetText,
                      w.net > 0 ? styles.statValueDebit : w.net < 0 ? styles.statValueCredit : styles.statValueNeutral,
                    ]}
                  >
                    {w.net >= 0 ? `+Rs. ${w.net.toLocaleString()}` : `-Rs. ${Math.abs(w.net).toLocaleString()}`}
                  </Text>
                  <View style={styles.weekCardBottomRow}>
                    <Text style={styles.weekEntriesCount}>{w.count} {w.count === 1 ? 'entry' : 'entries'}</Text>
                    <Text style={styles.weekViewDetailsText}>Kholein →</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionHeaderTitle}>📅 Day-wise Entries</Text>
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

      {/* Entry Rows: Flex Direction COLUMN for descriptive details */}
      {daySection.items.map((entry) => {
        const isItem = entry.type === 'item';
        return (
          <TouchableOpacity
            key={entry._id}
            style={styles.entryRow}
            onPress={() => handleEntryActions(entry)}
            activeOpacity={0.7}
          >
            {/* Left Column: Type pill + vertical details */}
            <View style={styles.entryLeftCol}>
              {/* Type Pill */}
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

              {/* Stacked Details (flexDirection: column) to prevent cramped text */}
              <View style={styles.entryDetailsColumn}>
                <Text style={styles.entryItemNameText}>
                  {isItem ? entry.itemName : 'Wasool Raqam'}
                </Text>
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

            {/* Right Column: Entry Amount */}
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
        <LoadingSpinner message="Loading mahine ka hisab..." />
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
              onRefresh={() => loadMonthData(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="📝"
              title="Is mahine koi entry nahi hai"
              subtitle="Pichle screen par ja kar entry add karein."
            />
          }
        />
      )}

      {/* Scoped Month Report Modal */}
      <SendReportModal
        visible={isReportModalVisible}
        onClose={() => setIsReportModalVisible(false)}
        customerId={customerId}
        customerName={customerName}
        fixedDateRange={monthRange}
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
  monthOverviewCard: {
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
  overviewCustomerName: {
    ...typography.h2,
    color: colors.primary,
  },
  overviewMonthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  monthReportButton: {
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  monthReportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  overviewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statValueDebit: {
    color: colors.danger,
  },
  statValueCredit: {
    color: colors.success,
  },
  statValuePrimary: {
    color: colors.primary,
  },
  statValueNeutral: {
    color: colors.textSecondary,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
  },
  // Opening Balance Banner
  openingBalanceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EBDCC8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  openingBalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  openingArrowIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  openingLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    fontStyle: 'italic',
  },
  openingBalanceAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.accent,
  },
  // Weekly Section
  weeklySection: {
    marginBottom: spacing.md,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  weeklyCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekCardTouchable: {
    width: '48%',
  },
  weekCard: {
    width: '100%',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekCardTop: {
    marginBottom: 4,
  },
  weekCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  weekViewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  weekDateRange: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  weekNetText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  weekEntriesCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Day Card Styles
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
  // Entry Row Layout: Column-based for clean vertical hierarchy
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
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  entryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: spacing.sm,
    marginTop: 2,
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
  // Details in COLUMN (Vertical stacking)
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
});
