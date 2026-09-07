// src/screens/WholesalerWeekDetailScreen.js
// Wholesaler Weekly Detail Screen:
// - Header with Week Label & Date Range (e.g. "Week 1 (1 - 7 Sep 2026)")
// - Top overview card: Is Hafte Ki Kharedari, Is Hafte Ki Payment, and Weekly Net
// - Day-wise purchase/payment cards within this week with breakdown of loose/unpaired pieces
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
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import UpdatingIndicator from '../components/UpdatingIndicator';
import EntryTypeFilter from '../components/EntryTypeFilter';
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByWholesaler, deleteWholesalerEntry, createWholesalerEntry, updateWholesalerEntry } from '../api/wholesalerEntryApi';
import { getWholesalerById } from '../api/wholesalerApi';
import { getCachedWholesalerDetail } from '../storage/localCache';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { downloadWholesalerReportPdf } from '../api/wholesalerReportApi';

export default function WholesalerWeekDetailScreen({ route, navigation }) {
  const {
    wholesalerId,
    wholesalerName,
    monthKey,
    weekNum,
    startDay: paramStartDay,
    endDay: paramEndDay,
    weekLabel,
    dateRange,
    initialMonthData,
  } = route.params || {};

  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [advanceBaqi, setAdvanceBaqi] = useState(0);
  const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [adjustTimeString, setAdjustTimeString] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [adjustNote, setAdjustNote] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Defensive week boundaries fallback
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
  const [errorMessage, setErrorMessage] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const loadWeekData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        const cached = await getCachedWholesalerDetail(wholesalerId);
        if (cached?.wholesaler?.advanceBaqi !== undefined) {
          setAdvanceBaqi(cached.wholesaler.advanceBaqi);
        }
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

      const data = await getEntriesByWholesaler(wholesalerId);
      if (data?.wholesaler?.advanceBaqi !== undefined) {
        setAdvanceBaqi(data.wholesaler.advanceBaqi);
      }
      const targetMonth = (data.months || []).find((m) => m.monthKey === monthKey);

      if (targetMonth && targetMonth.entries) {
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
  }, [wholesalerId, monthKey, startDay, endDay, entries.length]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadWeekData();
    });
    return unsubscribe;
  }, [navigation, loadWeekData]);

  useEffect(() => {
    navigation.setOptions({
      title: `${weekLabel || 'Week'} (${dateRange || ''})`,
    });
  }, [weekLabel, dateRange, navigation]);

  useEffect(() => {
    if (route.params?.openAdjustEntry) {
      const targetEntry = route.params.openAdjustEntry;
      navigation.setParams({ openAdjustEntry: null });
      openAdjustModal(targetEntry);
    }
  }, [route.params?.openAdjustEntry]);

  // Compute Weekly Totals
  // Is Hafte Ki Payment includes regular payments AND advance settlements
  // Net is strictly Kharedari - Payment (advance given is separate)
  const weeklyTotals = useMemo(() => {
    let totalKharedari = 0;
    let totalPayment = 0;
    let totalAdvance = 0;
    let totalAdvanceSettlement = 0;

    entries.forEach((e) => {
      if (e.type === 'purchase') {
        totalKharedari += e.amount;
      } else if (e.type === 'payment') {
        totalPayment += e.amount;
      } else if (e.type === 'advanceSettlement') {
        totalPayment += e.amount;
        totalAdvanceSettlement += e.amount;
      } else if (e.type === 'advance') {
        totalAdvance += e.amount;
      }
    });

    const net = totalKharedari - totalPayment;

    return {
      totalKharedari,
      totalPayment,
      totalAdvance,
      totalAdvanceSettlement,
      net,
      count: entries.length,
    };
  }, [entries]);

  // Filter counts
  const filterCounts = useMemo(() => {
    let purchase = 0;
    let payment = 0;
    let advance = 0;
    let settlement = 0;
    entries.forEach((e) => {
      if (e.type === 'purchase') purchase++;
      else if (e.type === 'payment') payment++;
      else if (e.type === 'advance') advance++;
      else if (e.type === 'advanceSettlement') settlement++;
    });
    return { all: entries.length, item: purchase, payment, advance, settlement };
  }, [entries]);

  // Group entries into day-wise sections (newest date first)
  const dayWiseGroups = useMemo(() => {
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

    entries.forEach((entry) => {
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
      } else if (entry.type === 'payment' || entry.type === 'advanceSettlement') {
        groups[dateKey].dayTotal -= entry.amount;
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.dateKey) - new Date(a.dateKey)
    );
  }, [entries, entryTypeFilter]);

  // Determine default date within the week
  const getDefaultDateForWeek = useCallback(() => {
    const today = new Date();
    if (!monthKey) return today;

    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    // Check if today falls in this week
    if (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() >= startDay &&
      today.getDate() <= endDay
    ) {
      return today;
    }

    // Otherwise default to the start day of this week
    return new Date(year, month, Math.max(1, startDay), 12, 0, 0);
  }, [monthKey, startDay, endDay]);

  const openAdjustModal = async (entryToEdit = null) => {
    setAdjustError('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setEditingEntry(entryToEdit);

    if (entryToEdit) {
      setAdjustAmount(String(entryToEdit.amount || ''));
      setAdjustDate(new Date(entryToEdit.entryDate));
      setAdjustTimeString(
        entryToEdit.entryTime ||
        new Date(entryToEdit.entryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setAdjustNote(entryToEdit.note || '');
    } else {
      setAdjustDate(getDefaultDateForWeek());
      setAdjustTimeString(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      // Pre-fill with outstanding net amount if positive, or 0
      const defaultAmt = weeklyTotals.net > 0 ? Math.min(weeklyTotals.net, advanceBaqi > 0 ? advanceBaqi : weeklyTotals.net) : 0;
      setAdjustAmount(defaultAmt > 0 ? String(defaultAmt) : '');
      setAdjustNote('');
    }

    // Fetch fresh advance balance
    try {
      const wholesalerData = await getWholesalerById(wholesalerId);
      const pool = wholesalerData?.advanceBaqi !== undefined ? wholesalerData.advanceBaqi : advanceBaqi;
      setAdvanceBaqi(pool);
      if (!entryToEdit) {
        const defaultAmt = weeklyTotals.net > 0 ? Math.min(weeklyTotals.net, pool > 0 ? pool : weeklyTotals.net) : 0;
        setAdjustAmount(defaultAmt > 0 ? String(defaultAmt) : '');
      }
      setIsAdjustModalVisible(true);
    } catch (err) {
      setIsAdjustModalVisible(true);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) {
      setAdjustDate(selectedDate);
      setAdjustError('');
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedTime) {
      const formatted = selectedTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setAdjustTimeString(formatted);
    }
  };

  const isDateInCurrentWeek = (checkDate) => {
    if (!checkDate || !(checkDate instanceof Date) || isNaN(checkDate.getTime())) {
      return false;
    }
    if (!monthKey) return true;

    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;

    return (
      checkDate.getFullYear() === year &&
      checkDate.getMonth() === month &&
      checkDate.getDate() >= startDay &&
      checkDate.getDate() <= endDay
    );
  };

  const handleConfirmAdjustment = async () => {
    const parsedAmount = Number(adjustAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAdjustError('Valid adjustment amount enter karein (greater than 0)');
      return;
    }

    // When editing an existing settlement, exclude its existing amount from the pool check
    const existingEntryAmount = editingEntry ? (Number(editingEntry.amount) || 0) : 0;
    const availableForThisAction = advanceBaqi + existingEntryAmount;

    if (parsedAmount > availableForThisAction) {
      setAdjustError(
        `Amount available advance (Rs. ${availableForThisAction.toLocaleString()}) se ziyada nahi ho sakti`
      );
      return;
    }

    // Validate that the chosen date falls within the currently-viewed week
    if (!isDateInCurrentWeek(adjustDate)) {
      setAdjustError(
        `Ye date is hafte (${dateRange || `${startDay} - ${endDay}`}) ke andar honi chahiye`
      );
      return;
    }

    try {
      setIsSubmittingAdjust(true);
      setAdjustError('');

      const delta = parsedAmount - existingEntryAmount;
      const weekNetBefore = Math.max(0, weeklyTotals.net);
      const weekNetAfter = Math.max(0, weeklyTotals.net - delta);
      const advBefore = advanceBaqi;
      const advAfter = Math.max(0, advanceBaqi - delta);

      if (editingEntry) {
        await updateWholesalerEntry(editingEntry._id, {
          amount: parsedAmount,
          note: adjustNote ? adjustNote.trim() : `Advance se Rs. ${parsedAmount.toLocaleString()} kaata gaya`,
          entryDate: adjustDate.toISOString(),
          entryTime: adjustTimeString || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        await createWholesalerEntry({
          wholesalerId,
          type: 'advanceSettlement',
          amount: parsedAmount,
          note: adjustNote ? adjustNote.trim() : `Advance se Rs. ${parsedAmount.toLocaleString()} kaata gaya`,
          entryDate: adjustDate.toISOString(),
          entryTime: adjustTimeString || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      setIsAdjustModalVisible(false);
      Alert.alert(
        'Kamyabi',
        `Advance se Rs. ${parsedAmount.toLocaleString()} ${editingEntry ? 'update' : 'kaate'} gaye.\n\n` +
        `• Tarikh: ${adjustDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} (${adjustTimeString})\n` +
        `• Is hafte ka baqaya: Rs. ${weekNetBefore.toLocaleString()} se Rs. ${weekNetAfter.toLocaleString()} reh gaya.\n` +
        `• Advance baqi: Rs. ${advBefore.toLocaleString()} se Rs. ${advAfter.toLocaleString()} reh gaya.`
      );
      setEditingEntry(null);
      await loadWeekData(true);
    } catch (err) {
      setAdjustError(err.message || 'Advance se katoti karne me masla pesh aaya');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleEntryActions = (entry) => {
    Alert.alert(
      entry.type === 'purchase'
        ? 'Purchase Entry'
        : entry.type === 'advance'
          ? 'Advance Entry'
          : entry.type === 'advanceSettlement'
            ? 'Advance Se Kata'
            : 'Payment Entry',
      `${entry.type === 'purchase'
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
              openAdjustModal(entry);
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
                      loadWeekData(true);
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

  const handleGenerateWeekReport = async () => {
    if (!monthKey) return;
    try {
      setIsReportGenerating(true);
      const [yearStr, monthStr] = monthKey.split('-');

      const startDayStr = String(startDay).padStart(2, '0');
      const endDayStr = String(endDay).padStart(2, '0');
      const monthPadded = String(monthStr).padStart(2, '0');

      const startDate = `${yearStr}-${monthPadded}-${startDayStr}`;
      const endDate = `${yearStr}-${monthPadded}-${endDayStr}`;

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
        dialogTitle: `${wholesalerName} - ${weekLabel || 'Hafte Ka'} Hisab Report`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Week report generation error:', error);
      Alert.alert('Report Error', error.message || 'Report banane me masla pesh aaya.');
    } finally {
      setIsReportGenerating(false);
    }
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
            <Text style={styles.overviewCustomerName}>{wholesalerName || 'Wholesaler'}</Text>
            <Text style={styles.overviewWeekSubtitle}>{weekLabel} • {dateRange}</Text>
          </View>

          <TouchableOpacity
            style={styles.weekReportButton}
            onPress={handleGenerateWeekReport}
            disabled={isReportGenerating}
            activeOpacity={0.8}
          >
            <Text style={styles.weekReportButtonText}>
              {isReportGenerating ? '⏳ Ban Rahi Hai...' : '📄 Report Bhejein'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Financial Overview Stats */}
        <View style={styles.financialSummaryCard}>
          <View style={styles.financialColsRow}>
            {/* Is Hafte Ka Kul Bill */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Is Hafte Ka Kul Bill</Text>
              <Text style={[styles.financialValue, styles.textDebit]}>
                Rs. {weeklyTotals.totalKharedari.toLocaleString()}
              </Text>
            </View>

            <View style={styles.financialDivider} />

            {/* Payment Mila (normal cash/bank payment only) */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Payment Mila</Text>
              <Text style={[styles.financialValue, styles.textCredit]}>
                Rs. {(weeklyTotals.totalPayment - weeklyTotals.totalAdvanceSettlement).toLocaleString()}
              </Text>
            </View>

            {/* Advance Se Kata (only shown if non-zero) */}
            {weeklyTotals.totalAdvanceSettlement > 0 ? (
              <>
                <View style={styles.financialDivider} />
                <View style={styles.financialCol}>
                  <Text style={styles.financialLabel}>Advance Se Kata</Text>
                  <Text style={[styles.financialValue, styles.textSettlement]}>
                    Rs. {weeklyTotals.totalAdvanceSettlement.toLocaleString()}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Baqi Baqaya (Remaining unpaid for this week) */}
          <View style={styles.balanceHighlightBar}>
            <Text style={styles.balanceHighlightLabel}>Total Baqaya (Is Hafte Ka):</Text>
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
              Rs. {Math.abs(weeklyTotals.net).toLocaleString()}
              {weeklyTotals.net > 0 ? ' ' : weeklyTotals.net < 0 ? ' (Ziyada Adaigi)' : ' (Mukammal Ada)'}
            </Text>
          </View>
        </View>

        {/* Action Button: Advance Se Katein (Deduct from Advance) */}
        <TouchableOpacity
          style={styles.advanceAdjustButton}
          onPress={openAdjustModal}
          activeOpacity={0.8}
        >
          <Text style={styles.advanceAdjustButtonIcon}>🪙</Text>
          <View style={styles.advanceAdjustTextWrap}>
            <Text style={styles.advanceAdjustButtonTitle}>Advance Se Katein</Text>
            <Text style={styles.advanceAdjustButtonSubtitle}>
              Available Advance Pool: Rs. {advanceBaqi.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.advanceAdjustArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      {/* Filter Header and Chips */}
      <EntryTypeFilter
        filter={entryTypeFilter}
        onChangeFilter={(f) => setEntryTypeFilter(f)}
        isOpen={isFilterOpen}
        onToggleOpen={() => setIsFilterOpen((prev) => !prev)}
        counts={filterCounts}
        title="📅 Is Hafte Ki Entries"
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
                  <Text style={styles.entryTimeText}>🕒 {entry.entryTime}</Text>
                ) : null}
              </View>
            </View>

            {/* Right side: Amount and Action Dots */}
            <View style={styles.entryRightCol}>
              <Text
                style={[
                  styles.entryAmount,
                  isPurchase ? styles.amountDebit : styles.amountCredit,
                ]}
              >
                Rs. {entry.amount.toLocaleString()}
              </Text>
              <Text style={styles.moreActionDots}>•••</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  if (isLoading) {
    return <LoadingSpinner message="Hafte ka hisab load ho raha hai..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dayWiseGroups}
        keyExtractor={(item) => item.dateKey}
        renderItem={renderDayCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            title="Is hafte ki koi entries nahi hain"
            subtitle="Is hafte me koi kharedari ya payment record nahi hui."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadWeekData(true)}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Advance Adjustment Modal */}
      <Modal
        visible={isAdjustModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isSubmittingAdjust && setIsAdjustModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Text style={styles.modalIcon}>🪙</Text>
                  <Text style={styles.modalTitle}>
                    {editingEntry ? 'Advance Deduction Edit Karein' : 'Advance Se Katein'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => !isSubmittingAdjust && setIsAdjustModalVisible(false)}
                  style={styles.modalCloseButton}
                  disabled={isSubmittingAdjust}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Advance Pool Info Box */}
              <View style={styles.modalAdvancePoolBox}>
                <Text style={styles.modalAdvancePoolLabel}>
                  {editingEntry ? 'Available Advance Pool (Is Katoti Samet):' : 'Moujooda Available Advance Pool:'}
                </Text>
                <Text style={styles.modalAdvancePoolValue}>
                  Rs. {(advanceBaqi + (editingEntry ? (Number(editingEntry.amount) || 0) : 0)).toLocaleString()}
                </Text>
                <Text style={styles.modalAdvancePoolHint}>
                  Is hafte ka baqi bill: Rs. {Math.max(0, weeklyTotals.net).toLocaleString()}
                </Text>
              </View>

              {adjustError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{adjustError}</Text>
                </View>
              ) : null}

              {/* Date & Time Selectors */}
              <View style={styles.modalDateTimeRow}>
                <View style={[styles.modalDateTimeGroup, { marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Kis Date Ka Hisab? *</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                    disabled={isSubmittingAdjust}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerText}>
                      📅 {adjustDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.modalDateTimeGroup, { marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Waqt (Time)</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowTimePicker(true)}
                    disabled={isSubmittingAdjust}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePickerText}>⏰ {adjustTimeString}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={adjustDate}
                  mode="date"
                  display="default"
                  onValueChange={handleDateChange}
                  onDismiss={() => setShowDatePicker(false)}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={adjustDate}
                  mode="time"
                  display="default"
                  onValueChange={handleTimeChange}
                  onDismiss={() => setShowTimePicker(false)}
                />
              )}

              {/* Amount Input */}
              <Text style={styles.inputLabel}>Katoti Ki Raqam (Rs.) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="Raqam darj karein"
                placeholderTextColor={colors.textSecondary}
                value={adjustAmount}
                onChangeText={(val) => {
                  setAdjustAmount(val);
                  setAdjustError('');
                }}
                editable={!isSubmittingAdjust}
              />

              {/* Explicit Before/After Live Preview Box */}
              {(() => {
                const enteredAmt = Number(adjustAmount) || 0;
                const weekNetBefore = Math.max(0, weeklyTotals.net);
                const weekNetAfter = Math.max(0, weeklyTotals.net - enteredAmt);
                const advBefore = advanceBaqi;
                const advAfter = Math.max(0, advanceBaqi - enteredAmt);
                const formattedSelectedDate = adjustDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewTitle}>Nateeja Preview (Katoti Ke Baad):</Text>
                    <Text style={styles.previewText}>
                      • Tarikh: <Text style={styles.previewBold}>{formattedSelectedDate} ({adjustTimeString})</Text>
                    </Text>
                    <Text style={styles.previewText}>
                      • Katoti: Advance se <Text style={styles.previewBold}>Rs. {enteredAmt.toLocaleString()}</Text> kaate jayenge.
                    </Text>
                    <Text style={styles.previewText}>
                      • Is hafte ka baqaya: <Text style={styles.previewBold}>Rs. {weekNetBefore.toLocaleString()}</Text> se <Text style={[styles.previewBold, { color: weekNetAfter === 0 ? colors.success : colors.error }]}>Rs. {weekNetAfter.toLocaleString()}</Text> reh jayega.
                    </Text>
                    <Text style={styles.previewText}>
                      • Advance baqi: <Text style={styles.previewBold}>Rs. {advBefore.toLocaleString()}</Text> se <Text style={[styles.previewBold, { color: '#B26A00' }]}>Rs. {advAfter.toLocaleString()}</Text> reh jayega.
                    </Text>
                  </View>
                );
              })()}

              {/* Optional Note */}
              <Text style={styles.inputLabel}>Wazahat / Note (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                placeholder="Maslan: Hafte ke bill ki katoti"
                placeholderTextColor={colors.textSecondary}
                value={adjustNote}
                onChangeText={setAdjustNote}
                editable={!isSubmittingAdjust}
              />

              {/* Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsAdjustModalVisible(false)}
                  disabled={isSubmittingAdjust}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, isSubmittingAdjust && styles.modalConfirmBtnDisabled]}
                  onPress={handleConfirmAdjustment}
                  disabled={isSubmittingAdjust}
                  activeOpacity={0.8}
                >
                  {isSubmittingAdjust ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>
                      {editingEntry ? 'Update Katoti' : 'Advance Se Katein'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  topSection: {
    marginBottom: spacing.md,
  },
  weekOverviewCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerNameWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  overviewCustomerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  overviewWeekSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weekReportButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignSelf: 'center',
  },
  weekReportButtonText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  financialSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  financialColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  financialCol: {
    flex: 1,
    alignItems: 'center',
  },
  financialDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: spacing.xs,
  },
  financialLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  textDebit: {
    color: colors.error,
  },
  textCredit: {
    color: colors.success,
  },
  balanceHighlightBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  balanceHighlightLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  balanceHighlightValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  balanceDanger: {
    color: colors.error,
  },
  balanceCredit: {
    color: colors.success,
  },
  balanceZero: {
    color: colors.textSecondary,
  },
  dateCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs,
  },
  dateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  dayTotalText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  dayTotalDebit: {
    color: colors.error,
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
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  entryLeftCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  entryTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  purchasePill: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  paymentPill: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  advancePill: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE082',
    borderWidth: 1,
  },
  settlementPill: {
    backgroundColor: '#E1F5EE',
    borderColor: '#0F6E56',
    borderWidth: 1,
  },
  pillIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  entryTypeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  purchasePillText: {
    color: colors.error,
  },
  paymentPillText: {
    color: colors.success,
  },
  advancePillText: {
    color: '#E65100',
  },
  settlementPillText: {
    color: '#0F6E56',
  },
  advanceAdjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1F5EE',
    borderWidth: 1.5,
    borderColor: '#0F6E56',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: spacing.md,
    gap: 10,
  },
  advanceAdjustButtonIcon: {
    fontSize: 22,
  },
  advanceAdjustTextWrap: {
    flex: 1,
  },
  advanceAdjustButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F6E56',
  },
  advanceAdjustButtonSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0B4D3C',
    marginTop: 2,
  },
  advanceAdjustArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F6E56',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIcon: {
    fontSize: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  modalAdvancePoolBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.md,
  },
  modalAdvancePoolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8D5B00',
  },
  modalAdvancePoolValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B26A00',
    marginTop: 2,
  },
  modalAdvancePoolHint: {
    fontSize: 11,
    color: '#A06B00',
    marginTop: 4,
  },
  modalErrorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 8,
    marginBottom: spacing.sm,
  },
  modalErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#F8F7F4',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  modalDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalDateTimeGroup: {
    flex: 1,
  },
  datePickerButton: {
    backgroundColor: '#F8F7F4',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  noteInput: {
    minHeight: 44,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    color: '#14532D',
    lineHeight: 18,
  },
  previewBold: {
    fontWeight: '700',
  },
  textAdvance: {
    color: '#E65100',
  },
  textSettlement: {
    color: '#0F6E56',
  },
  entryDetailsColumn: {
    marginTop: 2,
  },
  itemNameRow: {
    marginBottom: 2,
  },
  entryItemNameText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  breakdownContainer: {
    marginTop: 2,
    marginBottom: 2,
  },
  entryQtyRateText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  adjustmentLineExtra: {
    fontSize: typography.fontSize.xs,
    color: '#D97706', // Amber/orange for extra adjustment
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  adjustmentLineShortage: {
    fontSize: typography.fontSize.xs,
    color: '#DC2626', // Red for shortage reduction
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  entryNoteText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  entryTimeText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  entryAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  amountDebit: {
    color: colors.error,
  },
  amountCredit: {
    color: colors.success,
  },
  moreActionDots: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
