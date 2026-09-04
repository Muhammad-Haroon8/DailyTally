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
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByCustomer, deleteEntry } from '../api/entryApi';

export default function WeekDetailScreen({ route, navigation }) {
  const {
    customerId,
    customerName,
    monthKey,
    monthLabel,
    weekNum,
    startDay,
    endDay,
    weekLabel,
    dateRange,
  } = route.params || {};

  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadWeekData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
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
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [customerId, monthKey, startDay, endDay]);

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

  // Group entries into day-wise sections (newest date first)
  const dayWiseGroups = useMemo(() => {
    const groups = {};

    entries.forEach((entry) => {
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
  }, [entries]);

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
      {/* Weekly Stats Card */}
      <Card style={styles.weekOverviewCard}>
        <View style={styles.overviewTopRow}>
          <View>
            <Text style={styles.overviewCustomerName}>{customerName || 'Gahak'}</Text>
            <Text style={styles.overviewWeekSubtitle}>{weekLabel} • {dateRange}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{weeklyTotals.count} {weeklyTotals.count === 1 ? 'entry' : 'entries'}</Text>
          </View>
        </View>

        <View style={styles.overviewStatsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Kul Udhaar (Items)</Text>
            <Text style={[styles.statValue, styles.statValueDebit]}>
              Rs. {weeklyTotals.totalUdhaar.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Kul Wasool (Cash)</Text>
            <Text style={[styles.statValue, styles.statValueCredit]}>
              Rs. {weeklyTotals.totalWasool.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Week Net</Text>
            <Text
              style={[
                styles.statValue,
                weeklyTotals.net > 0
                  ? styles.statValueDebit
                  : weeklyTotals.net < 0
                  ? styles.statValueCredit
                  : styles.statValueNeutral,
              ]}
            >
              {weeklyTotals.net >= 0 ? `+Rs. ${weeklyTotals.net.toLocaleString()}` : `-Rs. ${Math.abs(weeklyTotals.net).toLocaleString()}`}
            </Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionHeaderTitle}>📅 Is Hafte Ke Din-Ba-Din Entries</Text>
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
            <EmptyState
              icon="📝"
              title="Is hafte koi entry nahi hai"
              subtitle="Pichle screen par ja kar entry add karein."
            />
          }
        />
      )}
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  statValueDebit: {
    color: colors.danger,
  },
  statValueCredit: {
    color: colors.success,
  },
  statValueNeutral: {
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
