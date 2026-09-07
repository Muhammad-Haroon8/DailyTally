// src/screens/WholesalerMonthDetailScreen.js
// Wholesaler Month Detail Screen:
// - Header with Month Label (e.g. "September 2026")
// - Opening balance carried forward banner (↳ Pichla baqaya)
// - Weekly summary cards (Week 1, Week 2, etc.)
// - Day-wise transaction cards with breakdown for extra/shortage adjustments
// - Action buttons: "Purchase Add Karein" & "Payment Karein"

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
import UpdatingIndicator from '../components/UpdatingIndicator';
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByWholesaler, deleteWholesalerEntry } from '../api/wholesalerEntryApi';
import { getCachedWholesalerDetail } from '../storage/localCache';
import EntryTypeFilter from '../components/EntryTypeFilter';
import * as Sharing from 'expo-sharing';
import { downloadWholesalerReportPdf } from '../api/wholesalerReportApi';

export default function WholesalerMonthDetailScreen({ route, navigation }) {
  const { wholesalerId, wholesalerName, monthKey, initialMonthData } = route.params || {};

  const [monthData, setMonthData] = useState(initialMonthData || null);
  const [isLoading, setIsLoading] = useState(!initialMonthData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all'); // 'all' | 'item' (purchase) | 'payment'
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const loadMonthData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (!monthData) {
        const cached = await getCachedWholesalerDetail(wholesalerId);
        const cachedMonth = (cached?.months || []).find((m) => m.monthKey === monthKey);
        if (cachedMonth) {
          setMonthData(cachedMonth);
          setIsLoading(false);
          setIsBackgroundUpdating(true);
        } else {
          setIsLoading(true);
        }
      }
      setErrorMessage('');

      const freshData = await getEntriesByWholesaler(wholesalerId);
      const freshMonth = (freshData?.months || []).find((m) => m.monthKey === monthKey);
      if (freshMonth) {
        setMonthData(freshMonth);
      }
    } catch (error) {
      if (!monthData) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsBackgroundUpdating(false);
    }
  }, [wholesalerId, monthKey, monthData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMonthData();
    });
    return unsubscribe;
  }, [navigation, loadMonthData]);

  useEffect(() => {
    if (monthData?.monthLabel) {
      navigation.setOptions({
        title: monthData.monthLabel,
      });
    }
  }, [monthData?.monthLabel, navigation]);

  // Weekly summaries within this month
  const weeklySummaries = useMemo(() => {
    if (!monthData || !monthData.entries || monthData.entries.length === 0) return [];

    const weeks = [
      { weekNum: 1, startDay: 1, endDay: 7, label: 'Week 1', net: 0, count: 0 },
      { weekNum: 2, startDay: 8, endDay: 14, label: 'Week 2', net: 0, count: 0 },
      { weekNum: 3, startDay: 15, endDay: 21, label: 'Week 3', net: 0, count: 0 },
      { weekNum: 4, startDay: 22, endDay: 28, label: 'Week 4', net: 0, count: 0 },
      { weekNum: 5, startDay: 29, endDay: 31, label: 'Week 5', net: 0, count: 0 },
    ];

    const monthShort = monthData.monthLabel ? monthData.monthLabel.split(' ')[0].slice(0, 3) : '';

    monthData.entries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      const day = d.getDate();

      const week = weeks.find((w) => day >= w.startDay && day <= w.endDay);
      if (week) {
        week.count += 1;
        if (entry.type === 'purchase') {
          week.net += entry.amount;
        } else if (entry.type === 'payment' || entry.type === 'advanceSettlement') {
          week.net -= entry.amount;
        }
      }
    });

    return weeks
      .filter((w) => w.count > 0)
      .map((w) => ({
        ...w,
        dateRange: `${w.startDay} - ${w.endDay} ${monthShort}`,
      }));
  }, [monthData]);

  const filterCounts = useMemo(() => {
    if (!monthData || !monthData.entries) return { all: 0, item: 0, payment: 0, advance: 0, settlement: 0 };
    let purchase = 0;
    let payment = 0;
    let advance = 0;
    let settlement = 0;
    monthData.entries.forEach((e) => {
      if (e.type === 'purchase') purchase++;
      else if (e.type === 'payment') payment++;
      else if (e.type === 'advance') advance++;
      else if (e.type === 'advanceSettlement') settlement++;
    });
    return { all: monthData.entries.length, item: purchase, payment, advance, settlement };
  }, [monthData]);

  // Group entries into Day-wise cards with filter
  const dayWiseGroups = useMemo(() => {
    if (!monthData || !monthData.entries) return [];

    const targetType =
      entryTypeFilter === 'item'
        ? 'purchase'
        : entryTypeFilter === 'payment'
          ? 'payment'
          : entryTypeFilter === 'advance'
            ? 'advance'
            : entryTypeFilter === 'advanceSettlement'
              ? 'advanceSettlement'
              : null;

    const groups = {};

    monthData.entries.forEach((entry) => {
      if (targetType && entry.type !== targetType) {
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

      if (entry.type === 'purchase') {
        groups[dateKey].dayTotal += entry.amount;
      } else {
        groups[dateKey].dayTotal -= entry.amount;
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.dateKey) - new Date(a.dateKey)
    );
  }, [monthData, entryTypeFilter]);

  const handleEntryActions = (entry) => {
    Alert.alert(
      entry.type === 'purchase'
        ? 'Purchase Entry'
        : entry.type === 'advance'
          ? 'Advance Entry'
          : entry.type === 'advanceSettlement'
            ? 'Advance Se Kata'
            : 'Payment Entry',
      `${
        entry.type === 'purchase'
          ? `${entry.quantity} ${entry.itemName} @ Rs.${entry.rate} = Rs.${entry.amount}`
          : entry.type === 'advance'
            ? `Advance: Rs. ${entry.amount}`
            : entry.type === 'advanceSettlement'
              ? `Advance se Rs. ${entry.amount.toLocaleString()} kaata gaya`
              : `Payment: Rs. ${entry.amount}`
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            if (entry.type === 'purchase') {
              navigation.navigate('AddPurchaseEntry', {
                wholesalerId,
                wholesalerName,
                entry,
              });
            } else if (entry.type === 'advance') {
              navigation.navigate('AddWholesalerAdvance', {
                wholesalerId,
                wholesalerName,
                entry,
              });
            } else if (entry.type === 'advanceSettlement') {
              const entryDateObj = new Date(entry.entryDate);
              const day = entryDateObj.getDate();
              const weeks = [
                { weekNum: 1, startDay: 1, endDay: 7, label: 'Week 1' },
                { weekNum: 2, startDay: 8, endDay: 14, label: 'Week 2' },
                { weekNum: 3, startDay: 15, endDay: 21, label: 'Week 3' },
                { weekNum: 4, startDay: 22, endDay: 28, label: 'Week 4' },
                { weekNum: 5, startDay: 29, endDay: 31, label: 'Week 5' },
              ];
              const targetWeek = weeks.find((w) => day >= w.startDay && day <= w.endDay) || weeks[0];
              const monthShort = monthData?.monthLabel ? monthData.monthLabel.split(' ')[0].slice(0, 3) : '';
              navigation.navigate('WholesalerWeekDetail', {
                wholesalerId,
                wholesalerName,
                monthKey,
                monthLabel: monthData?.monthLabel,
                weekLabel: targetWeek.label,
                dateRange: `${targetWeek.startDay} - ${targetWeek.endDay} ${monthShort}`,
                weekNum: targetWeek.weekNum,
                startDay: targetWeek.startDay,
                endDay: targetWeek.endDay,
                initialMonthData: monthData,
                openAdjustEntry: entry,
              });
            } else {
              navigation.navigate('AddWholesalerPayment', {
                wholesalerId,
                wholesalerName,
                entry,
              });
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Delete',
              'Kya aap waqai yeh entry delete karna chahte hain?',
              [
                { text: 'Nahi', style: 'cancel' },
                {
                  text: 'Haan, Delete Karein',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteWholesalerEntry(entry._id);
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

  const handleGenerateMonthReport = async () => {
    if (!monthKey) return;
    try {
      setIsReportGenerating(true);
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10); // 1-indexed

      // Start: 1st of month
      const startDate = `${yearStr}-${String(monthStr).padStart(2, '0')}-01`;
      // End: last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${yearStr}-${String(monthStr).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const localFileUri = await downloadWholesalerReportPdf(
        wholesalerId,
        startDate,
        endDate,
        wholesalerName
      );

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Save Ho Gaya', `Report save ho chuki hai:\n${localFileUri.split('/').pop()}`);
        return;
      }

      await Sharing.shareAsync(localFileUri, {
        mimeType: 'application/pdf',
        dialogTitle: `${wholesalerName} - ${monthData?.monthLabel || 'Month'} Report`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Month report generation error:', error);
      Alert.alert('Report Error', error.message || 'Report banane me masla pesh aaya.');
    } finally {
      setIsReportGenerating(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.topSection}>
      {isBackgroundUpdating ? (
        <UpdatingIndicator message="Wholesaler hisab update ho raha hai..." />
      ) : null}

      {/* Month Overview Card */}
      <Card style={styles.monthOverviewCard}>
        <View style={styles.overviewTopRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.overviewName}>{wholesalerName || 'Wholesaler'}</Text>
            <Text style={styles.overviewMonthLabel}>{monthData?.monthLabel}</Text>
          </View>

          <TouchableOpacity
            style={styles.monthReportButton}
            onPress={handleGenerateMonthReport}
            disabled={isReportGenerating}
            activeOpacity={0.8}
          >
            <Text style={styles.monthReportButtonText}>
              {isReportGenerating ? '⏳ Ban Rahi Hai...' : '📄 Report Bhejein'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Financial Summary: Is Mahine Ka Kharedari, Payment & Advance */}
        <View style={styles.financialSummaryCard}>
          <View style={styles.financialColsRow}>
            {/* Is Mahine Ka Kharedari */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Kharedari</Text>
              <Text style={[styles.financialValue, styles.textDebit]}>
                Rs. {(monthData?.monthKharedari || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.financialDivider} />

            {/* Is Mahine Ka Payment (includes advanceSettlement) */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Payment</Text>
              <Text style={[styles.financialValue, styles.textCredit]}>
                Rs. {(monthData?.monthPayment || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Net Highlight Bar */}
          <View style={styles.balanceHighlightBar}>
            <Text style={styles.balanceHighlightLabel}>Is Mahine Ka Net:</Text>
            <Text
              style={[
                styles.balanceHighlightValue,
                (monthData?.monthNet || 0) > 0
                  ? styles.balanceDanger
                  : (monthData?.monthNet || 0) < 0
                    ? styles.balanceCredit
                    : styles.balanceZero,
              ]}
            >
              {(monthData?.monthNet || 0) >= 0
                ? `+Rs. ${(monthData?.monthNet || 0).toLocaleString()}`
                : `-Rs. ${Math.abs(monthData?.monthNet || 0).toLocaleString()}`}
            </Text>
          </View>
        </View>

        {/* Action Buttons: Purchase, Payment, Advance */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButtonPill, styles.actionBtnPurchase]}
            onPress={() =>
              navigation.navigate('AddPurchaseEntry', {
                wholesalerId,
                wholesalerName,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonIcon}>📦</Text>
            <Text style={styles.actionButtonText}>Purchase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButtonPill, styles.actionBtnPayment]}
            onPress={() =>
              navigation.navigate('AddWholesalerPayment', {
                wholesalerId,
                wholesalerName,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonIcon}>💵</Text>
            <Text style={styles.actionButtonText}>Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButtonPill, styles.actionBtnAdvance]}
            onPress={() =>
              navigation.navigate('AddWholesalerAdvance', {
                wholesalerId,
                wholesalerName,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonIcon}>🪙</Text>
            <Text style={styles.actionButtonText}>Advance</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Opening Balance Carried Forward */}
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

      {/* Weekly Summary Cards */}
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
                  navigation.navigate('WholesalerWeekDetail', {
                    wholesalerId,
                    wholesalerName,
                    monthKey,
                    monthLabel: monthData?.monthLabel,
                    weekLabel: w.label,
                    dateRange: w.dateRange,
                    weekNum: w.weekNum,
                    startDay: w.startDay,
                    endDay: w.endDay,
                    initialMonthData: monthData,
                  })
                }
              >
                <Card style={styles.weekCard}>
                  <View style={styles.weekCardHeader}>
                    <Text style={styles.weekLabelText}>{w.label}</Text>
                    <View style={styles.entryCountBadge}>
                      <Text style={styles.entryCountBadgeText}>{w.count}</Text>
                    </View>
                  </View>
                  <Text style={styles.weekDateRangeText}>{w.dateRange}</Text>
                  <Text
                    style={[
                      styles.weekNetText,
                      w.net > 0 ? styles.statValueDebit : w.net < 0 ? styles.statValueCredit : styles.statValueNeutral,
                    ]}
                  >
                    {w.net >= 0 ? `+Rs. ${w.net.toLocaleString()}` : `-Rs. ${Math.abs(w.net).toLocaleString()}`}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Day-wise Entries Section with Filter Header */}
      <EntryTypeFilter
        filter={entryTypeFilter}
        onChangeFilter={(f) => setEntryTypeFilter(f)}
        isOpen={isFilterOpen}
        onToggleOpen={() => setIsFilterOpen((prev) => !prev)}
        counts={filterCounts}
        title="📅 Day-wise Entries"
        itemLabel="Kharedari"
        paymentLabel="Payment"
        advanceLabel="Advance"
        settlementLabel="Advance Se Kata"
        showAdvance={true}
        showSettlement={true}
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

      {/* Entry Rows */}
      {daySection.items.map((entry) => {
        const isPurchase = entry.type === 'purchase';
        const isAdvance = entry.type === 'advance';
        const isSettlement = entry.type === 'advanceSettlement';

        // Extract extra items (support array or legacy single field)
        let extraList = [];
        if (isPurchase) {
          if (Array.isArray(entry.extraItems) && entry.extraItems.length > 0) {
            extraList = entry.extraItems;
          } else if (entry.extraPieces > 0 || (entry.adjustmentType === 'extra' && entry.adjustmentPieces > 0)) {
            const pcs = entry.extraPieces || entry.adjustmentPieces || 0;
            const rt = entry.extraRate || entry.adjustmentRate || entry.rate || 0;
            const amt = entry.extraAmount || entry.adjustmentAmount || ((pcs / 2) * rt);
            extraList = [{ itemName: entry.itemName, pieces: pcs, rate: rt, amount: amt }];
          }
        }

        // Extract shortage items (support array or legacy single field)
        let shortageList = [];
        if (isPurchase) {
          if (Array.isArray(entry.shortageItems) && entry.shortageItems.length > 0) {
            shortageList = entry.shortageItems;
          } else if (entry.shortagePieces > 0 || (entry.adjustmentType === 'shortage' && entry.adjustmentPieces > 0)) {
            const pcs = entry.shortagePieces || entry.adjustmentPieces || 0;
            const rt = entry.shortageRate || entry.adjustmentRate || entry.rate || 0;
            const amt = entry.shortageAmount || entry.adjustmentAmount || ((pcs / 2) * rt);
            shortageList = [{ itemName: entry.itemName, pieces: pcs, rate: rt, amount: amt }];
          }
        }

        return (
          <TouchableOpacity
            key={entry._id}
            style={styles.entryRow}
            onPress={() => handleEntryActions(entry)}
            activeOpacity={0.7}
          >
            <View style={styles.entryLeftCol}>
              {/* Type Badge */}
              <View
                style={[
                  styles.entryTypePill,
                  isPurchase
                    ? styles.purchasePill
                    : isAdvance
                      ? styles.advancePill
                      : isSettlement
                        ? styles.settlementPill
                        : styles.paymentPill,
                ]}
              >
                <Text style={styles.pillIcon}>{isPurchase ? '📦' : isAdvance ? '🪙' : isSettlement ? '🔄' : '💵'}</Text>
                <Text
                  style={[
                    styles.entryTypeText,
                    isPurchase
                      ? styles.purchasePillText
                      : isAdvance
                        ? styles.advancePillText
                        : isSettlement
                          ? styles.settlementPillText
                          : styles.paymentPillText,
                  ]}
                >
                  {isPurchase ? 'KHAREDARI' : isAdvance ? 'ADVANCE' : isSettlement ? 'ADVANCE SE KATA' : 'PAYMENT'}
                </Text>
              </View>

              {/* Title & Calculation Breakdown */}
              <View style={styles.entryDetailsColumn}>
                <View style={styles.itemNameRow}>
                  <Text style={styles.entryItemNameText}>
                    {isPurchase
                      ? entry.itemName
                      : isAdvance
                        ? 'Wholesaler Advance'
                        : isSettlement
                          ? `Advance se Rs. ${entry.amount.toLocaleString()} kaata gaya`
                          : 'Wholesaler Payment'}
                  </Text>
                </View>

                {isPurchase ? (
                  <View style={styles.breakdownContainer}>
                    <Text style={styles.entryQtyRateText}>
                      {entry.quantity} × Rs.{entry.rate} = Rs.{(entry.baseAmount || (entry.quantity * entry.rate)).toLocaleString()}
                    </Text>

                    {extraList.map((item, idx) => (
                      <Text key={`ext-${idx}`} style={styles.adjustmentLineExtra}>
                        + Extra ({item.itemName || 'Item'}): ({item.pieces} pcs ÷ 2 × Rs.{item.rate} = Rs.{Math.round(item.amount).toLocaleString()})
                      </Text>
                    ))}

                    {shortageList.map((item, idx) => (
                      <Text key={`sho-${idx}`} style={styles.adjustmentLineShortage}>
                        − Kam ({item.itemName || 'Item'}): ({item.pieces} pcs ÷ 2 × Rs.{item.rate} = Rs.{Math.round(item.amount).toLocaleString()})
                      </Text>
                    ))}
                  </View>
                ) : null}

                {entry.note ? (
                  <Text style={styles.entryNoteText}>📝 {entry.note}</Text>
                ) : null}

                {entry.entryTime ? (
                  <Text style={styles.entryTimeText}>⏰ {entry.entryTime}</Text>
                ) : null}
              </View>
            </View>

            {/* Entry Amount */}
            <View style={styles.entryRightCol}>
              <Text
                style={[
                  styles.entryAmountText,
                  isPurchase ? styles.purchaseAmount : isAdvance ? styles.advanceAmount : styles.paymentAmount,
                ]}
              >
                {isPurchase ? `Rs. ${entry.amount.toLocaleString()}` : `− Rs. ${entry.amount.toLocaleString()}`}
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
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            entryTypeFilter !== 'all' ? (
              <EmptyState
                icon="🔍"
                title="Is filter ke mutabiq koi entry nahi mili"
                subtitle={`Is mahine koi ${entryTypeFilter === 'item' ? 'Kharedari' : 'Payment'} entry moujood nahi hai.`}
                actionLabel="Sab Entries Dekhein"
                onAction={() => setEntryTypeFilter('all')}
              />
            ) : (
              <EmptyState
                icon="📝"
                title="Is mahine koi entry nahi hai"
                subtitle="Pichle screen par ja kar entry add karein."
              />
            )
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
  nameWrap: {
    flex: 1,
    marginRight: 8,
  },
  overviewName: {
    ...typography.h2,
    color: colors.accent,
  },
  overviewMonthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  monthReportButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignSelf: 'center',
  },
  monthReportButtonText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  financialSummaryCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButtonPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnPurchase: {
    backgroundColor: colors.accentLight,
    borderColor: '#F6D29A',
  },
  actionBtnPayment: {
    backgroundColor: colors.successLight,
    borderColor: '#BFE7DB',
  },
  actionBtnAdvance: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFCC80',
  },
  actionButtonIcon: {
    fontSize: 15,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
  },
  openingBalanceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3EFEA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  openingBalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  openingArrowIcon: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: 'bold',
  },
  openingLabelText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  openingBalanceAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
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
    flexGrow: 1,
  },
  weekCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  weekLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  entryCountBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  entryCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  weekDateRangeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  weekNetText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
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
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayTotalText: {
    fontSize: 12,
    fontWeight: '700',
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
  },
  entryLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  entryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 5,
  },
  purchasePill: {
    backgroundColor: colors.accentLight,
  },
  paymentPill: {
    backgroundColor: colors.successLight,
  },
  advancePill: {
    backgroundColor: '#FFF3E0',
  },
  pillIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  entryTypeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  purchasePillText: {
    color: colors.accent,
  },
  paymentPillText: {
    color: colors.success,
  },
  advancePillText: {
    color: '#E65100',
  },
  settlementPill: {
    backgroundColor: '#E1F5EE',
    borderColor: '#0F6E56',
  },
  settlementPillText: {
    color: '#0F6E56',
  },
  entryDetailsColumn: {
    paddingLeft: 2,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  entryItemNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownContainer: {
    marginTop: 2,
    marginBottom: 2,
  },
  entryQtyRateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  adjustmentLineExtra: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  adjustmentLineShortage: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
    marginTop: 2,
  },
  entryNoteText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  entryTimeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  entryRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 4,
  },
  entryAmountText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  purchaseAmount: {
    color: colors.danger,
  },
  paymentAmount: {
    color: colors.success,
  },
  advanceAmount: {
    color: '#E65100',
  },
  textAdvance: {
    color: '#E65100',
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
  statValueDebit: {
    color: colors.danger,
  },
  statValueCredit: {
    color: colors.success,
  },
  statValueNeutral: {
    color: colors.textSecondary,
  },
});
