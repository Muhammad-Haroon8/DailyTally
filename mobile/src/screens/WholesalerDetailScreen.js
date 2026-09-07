// src/screens/WholesalerDetailScreen.js
// Wholesaler Detail Screen:
// - Top Section: Wholesaler Info, Kul Kharedari, Kul Payment & Baqi Baqaya (what's owed)
// - "Purchase Add Karein" & "Payment Karein" action buttons
// - Vertical list of Month Cards with EntryTypeFilter (Sab / Kharedari / Payment)
// - Tapping a month card navigates to WholesalerMonthDetailScreen

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import UpdatingIndicator from '../components/UpdatingIndicator';
import { colors, typography, spacing } from '../constants/theme';
import { getEntriesByWholesaler } from '../api/wholesalerEntryApi';
import { getCachedWholesalerDetail } from '../storage/localCache';
import EntryTypeFilter from '../components/EntryTypeFilter';
import WholesalerSendReportModal from '../components/WholesalerSendReportModal';

export default function WholesalerDetailScreen({ route, navigation }) {
  const { wholesalerId, wholesalerName: initialName } = route.params || {};

  const [wholesaler, setWholesaler] = useState({ name: initialName, balance: 0, totalKharedari: 0, totalPayment: 0 });
  const [months, setMonths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all'); // 'all' | 'item' (purchase) | 'payment'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        const cached = await getCachedWholesalerDetail(wholesalerId);
        if (cached && (cached.wholesaler || cached.months)) {
          if (cached.wholesaler) setWholesaler(cached.wholesaler);
          if (cached.months) setMonths(cached.months);
          setIsLoading(false);
          setIsBackgroundUpdating(true);
        } else {
          setIsLoading(true);
        }
      }
      setErrorMessage('');

      const data = await getEntriesByWholesaler(wholesalerId);
      setWholesaler(data.wholesaler);
      setMonths(data.months || []);
    } catch (error) {
      if (months.length === 0) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsBackgroundUpdating(false);
    }
  }, [wholesalerId, months.length]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const balance = wholesaler?.baqiBaqaya !== undefined ? wholesaler.baqiBaqaya : (wholesaler?.balance || 0);

  // Overall entries count across all months
  const filterCounts = useMemo(() => {
    let purchase = 0;
    let payment = 0;
    let advance = 0;
    let settlement = 0;
    let all = 0;
    months.forEach((m) => {
      (m.entries || []).forEach((e) => {
        all++;
        if (e.type === 'purchase') purchase++;
        else if (e.type === 'payment') payment++;
        else if (e.type === 'advance') advance++;
        else if (e.type === 'advanceSettlement') settlement++;
      });
    });
    return { all, item: purchase, payment, advance, settlement };
  }, [months]);

  // Filtered months list
  const filteredMonths = useMemo(() => {
    if (entryTypeFilter === 'all') return months;

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

    return months
      .map((m) => {
        const matchingEntries = (m.entries || []).filter(
          (e) => e.type === targetType
        );
        if (matchingEntries.length === 0) return null;

        const filteredNet = matchingEntries.reduce((sum, e) => {
          return sum + (e.type === 'purchase' ? e.amount : -e.amount);
        }, 0);

        return {
          ...m,
          filteredEntries: matchingEntries,
          displayNet: filteredNet,
        };
      })
      .filter(Boolean);
  }, [months, entryTypeFilter]);

  const renderMonthCard = ({ item: monthItem }) => {
    const displayNet =
      monthItem.displayNet !== undefined ? monthItem.displayNet : monthItem.monthNet;
    const isDebit = displayNet > 0;
    const isCredit = displayNet < 0;
    const displayEntriesCount = monthItem.filteredEntries
      ? monthItem.filteredEntries.length
      : monthItem.entries.length;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('WholesalerMonthDetail', {
            wholesalerId,
            wholesalerName: wholesaler.name,
            monthKey: monthItem.monthKey,
            initialMonthData: monthItem,
          })
        }
      >
        <Card style={styles.monthCard}>
          <View style={styles.monthCardLeft}>
            <View style={styles.monthIconWrap}>
              <Text style={styles.monthCalendarIcon}>🗓️</Text>
            </View>
            <View style={styles.monthInfoCol}>
              <Text style={styles.monthLabelText}>{monthItem.monthLabel}</Text>
              <Text style={styles.monthNetText}>
                Is mahine ka hisab:{' '}
                <Text
                  style={[
                    styles.netAmountHighlight,
                    isDebit ? styles.textDebit : isCredit ? styles.textCredit : styles.textNeutral,
                  ]}
                >
                  {displayNet >= 0
                    ? `+Rs. ${displayNet.toLocaleString()}`
                    : `-Rs. ${Math.abs(displayNet).toLocaleString()}`}
                </Text>
              </Text>
              <Text style={styles.monthEntriesCountText}>
                {displayEntriesCount} {displayEntriesCount === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
          </View>

          <View style={styles.monthCardRight}>
            <Text style={styles.viewDetailsText}>Tafseel Dekhein →</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sticky Balance & Wholesaler Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <View style={styles.wholesalerNameRow}>
              <Text style={styles.wholesalerName}>{wholesaler.name || 'Wholesaler'}</Text>
            </View>
            {wholesaler.phone ? (
              <Text style={styles.wholesalerPhone}>📞 {wholesaler.phone}</Text>
            ) : null}
          </View>
          <View style={styles.headerActionButtonsRow}>
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setIsReportModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.reportButtonText}>📄 Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manageItemsButton}
              onPress={() => navigation.navigate('ManageWholesalerItems')}
              activeOpacity={0.8}
            >
              <Text style={styles.manageItemsText}>📦 Items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate('AddEditWholesaler', { wholesalerId })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.editText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Summary: 3-Figure Main Card (Kharedari, Payment, Baqi Baqaya) */}
        <View style={styles.financialSummaryCard}>
          <View style={styles.financialColsRow}>
            {/* Kul Kharedari */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Kul Kharedari</Text>
              <Text style={[styles.financialValue, styles.textDebit]}>
                Rs. {(wholesaler.totalKharedari || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.financialDivider} />

            {/* Kul Payment (including settlements) */}
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Kul Payment</Text>
              <Text style={[styles.financialValue, styles.textCredit]}>
                Rs. {(wholesaler.totalPayment || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Baqi Baqaya Highlight Bar (strictly Kharedari - Payment) */}
          <View style={styles.balanceHighlightBar}>
            <Text style={styles.balanceHighlightLabel}>
              Baqi Baqaya (Total Dena Hai):
            </Text>
            <Text
              style={[
                styles.balanceHighlightValue,
                balance > 0
                  ? styles.balanceDanger
                  : balance < 0
                    ? styles.balanceCredit
                    : styles.balanceZero,
              ]}
            >
              Rs. {Math.abs(balance).toLocaleString()}
              {balance > 0 ? ' (Dena Hai)' : balance < 0 ? ' (Wasooli Ziyada)' : ' (Saaf)'}
            </Text>
          </View>
        </View>

        {/* Separate Kul Advance Baqi Card */}
        <View style={styles.advancePoolCard}>
          <View style={styles.advancePoolLeft}>
            <View style={styles.advancePoolIconWrap}>
              <Text style={styles.advancePoolIcon}>🪙</Text>
            </View>
            <View>
              <Text style={styles.advancePoolTitle}>Kul Advance Baqi</Text>
              <Text style={styles.advancePoolSubtitle}>
                Diya: Rs. {(wholesaler.totalAdvance || 0).toLocaleString()} | Adjust: Rs. {(wholesaler.totalAdvanceSettlement || 0).toLocaleString()}
              </Text>
            </View>
          </View>
          <Text style={styles.advancePoolAmount}>
            Rs. {(wholesaler.advanceBaqi !== undefined ? wholesaler.advanceBaqi : ((wholesaler.totalAdvance || 0) - (wholesaler.totalAdvanceSettlement || 0))).toLocaleString()}
          </Text>
        </View>

        {/* Action Buttons: 3 Action Buttons (Purchase, Payment, Advance) */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButtonPill, styles.actionBtnPurchase]}
            onPress={() =>
              navigation.navigate('AddPurchaseEntry', {
                wholesalerId,
                wholesalerName: wholesaler.name,
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
                wholesalerName: wholesaler.name,
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
                wholesalerName: wholesaler.name,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonIcon}>🪙</Text>
            <Text style={styles.actionButtonText}>Advance</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Summary Pill */}
        <View style={styles.summaryPillRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>Kul Mahine</Text>
            <Text style={styles.summaryPillValue}>{months.length} Active</Text>
          </View>
          <View style={styles.summaryPillDivider} />
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>Kul Entries</Text>
            <Text style={styles.summaryPillValue}>
              {months.reduce((acc, m) => acc + (m.entries?.length || 0), 0)} Total
            </Text>
          </View>
          <View style={styles.summaryPillDivider} />
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillLabel}>Status</Text>
            <Text
              style={[
                styles.summaryPillValue,
                balance > 0 ? styles.textDebit : balance < 0 ? styles.textCredit : styles.textNeutral,
              ]}
            >
              {balance > 0 ? 'Dena Hai' : balance < 0 ? 'Advance' : 'Saaf Hisab'}
            </Text>
          </View>
        </View>
      </View>

      {/* Subtle Background Sync Indicator */}
      {isBackgroundUpdating ? (
        <UpdatingIndicator message="Wholesaler hisab update ho raha hai..." />
      ) : null}

      {/* Error Message with Retry */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton
            title="🔄 Dobara Koshish Karein (Retry)"
            variant="danger"
            onPress={() => loadData()}
            style={styles.retryButton}
          />
        </View>
      ) : null}

      {/* List Header Title with Filter */}
      <View style={styles.listHeaderBar}>
        <EntryTypeFilter
          filter={entryTypeFilter}
          onChangeFilter={(f) => setEntryTypeFilter(f)}
          isOpen={isFilterOpen}
          onToggleOpen={() => setIsFilterOpen((prev) => !prev)}
          counts={filterCounts}
          title="🗓️ Mahinawaar Hisab (Months List)"
          itemLabel="Kharedari"
          paymentLabel="Payment"
          advanceLabel="Advance"
          settlementLabel="Advance Se Kata"
          showAdvance={true}
          showSettlement={true}
        />
        <Text style={styles.listHeaderSubtitle}>Mahine par tap kar ke tafseel dekhein</Text>
      </View>

      {/* Vertical List of Month Cards */}
      {isLoading ? (
        <LoadingSpinner message="Loading mahinawaar hisab..." />
      ) : (
        <FlatList
          data={filteredMonths}
          keyExtractor={(item) => item.monthKey}
          renderItem={renderMonthCard}
          contentContainerStyle={
            filteredMonths.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            entryTypeFilter !== 'all' ? (
              <EmptyState
                icon="🔍"
                title="Is filter ke mutabiq koi entry nahi mili"
                subtitle={`Wholesaler ke hisab me koi ${entryTypeFilter === 'item' ? 'Kharedari' : 'Payment'} entry moujood nahi hai.`}
                actionLabel="Sab Entries Dekhein"
                onAction={() => setEntryTypeFilter('all')}
              />
            ) : (
              <EmptyState
                icon="📝"
                title="Abhi koi entry nahi hui"
                subtitle="Upar diye gaye buttons 'Purchase Add Karein' ya 'Payment Karein' se pehli entry shuru karein."
              />
            )
          }
        />
      )}

      {/* Wholesaler Send Report Modal */}
      <WholesalerSendReportModal
        visible={isReportModalVisible}
        onClose={() => setIsReportModalVisible(false)}
        wholesalerId={wholesalerId}
        wholesalerName={wholesaler.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  wholesalerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wholesalerName: {
    ...typography.h1,
  },
  wholesalerPhone: {
    ...typography.bodySmall,
    marginTop: 4,
    color: colors.textSecondary,
  },
  headerActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  reportButtonText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '700',
  },
  manageItemsButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  manageItemsText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  financialSummaryCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
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
  balanceHighlightBarCredit: {
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FFE082',
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
  advancePoolCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  advancePoolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  advancePoolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE8A1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancePoolIcon: {
    fontSize: 18,
  },
  advancePoolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8D5B00',
  },
  advancePoolSubtitle: {
    fontSize: 11,
    color: '#A06B00',
    marginTop: 2,
  },
  advancePoolAmount: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#B26A00',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  summaryPillRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF9F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryPill: {
    flex: 1,
    alignItems: 'center',
  },
  summaryPillLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  summaryPillValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryPillDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  listHeaderBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 36,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  monthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  monthCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  monthIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  monthCalendarIcon: {
    fontSize: 22,
  },
  monthInfoCol: {
    flex: 1,
  },
  monthLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  monthNetText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  netAmountHighlight: {
    fontWeight: '700',
  },
  monthEntriesCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  monthCardRight: {
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  balanceDanger: {
    color: colors.danger,
  },
  balanceCredit: {
    color: colors.success,
  },
  balanceAdvanceCredit: {
    color: '#E65100', // Clear deep amber/orange indicating advance balance remaining
    fontWeight: 'bold',
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
  textAdvance: {
    color: '#E65100',
  },
  textNeutral: {
    color: colors.textSecondary,
  },
});
