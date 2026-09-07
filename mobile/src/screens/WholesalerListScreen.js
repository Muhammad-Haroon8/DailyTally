// src/screens/WholesalerListScreen.js
// Wholesaler list screen with aggregated analytics card, search, and navigation

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { getWholesalers, getWholesalerAnalyticsSummary } from '../api/wholesalerApi';
import { getCachedWholesalers, getCachedWholesalerAnalyticsSummary } from '../storage/localCache';

export default function WholesalerListScreen({ navigation }) {
  const [wholesalers, setWholesalers] = useState([]);
  const [analytics, setAnalytics] = useState({ totalKharedari: 0, totalPayment: 0, baqiBaqaya: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchWholesalerList = useCallback(async (query = '', isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        if (!query) {
          const [cachedWholesalers, cachedAnalytics] = await Promise.all([
            getCachedWholesalers(),
            getCachedWholesalerAnalyticsSummary(),
          ]);
          if (cachedAnalytics) {
            setAnalytics(cachedAnalytics);
          }
          if (cachedWholesalers && cachedWholesalers.length > 0) {
            setWholesalers(cachedWholesalers);
            setIsLoading(false);
            setIsBackgroundUpdating(true);
          } else {
            setIsLoading(true);
          }
        }
      }
      setErrorMessage('');

      const [wholesalersData, analyticsData] = await Promise.all([
        getWholesalers(query),
        getWholesalerAnalyticsSummary(),
      ]);

      setWholesalers(wholesalersData);
      if (analyticsData) {
        setAnalytics(analyticsData);
      }
    } catch (error) {
      if (wholesalers.length === 0) {
        setErrorMessage(error.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsBackgroundUpdating(false);
    }
  }, [wholesalers.length]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchWholesalerList(searchQuery);
    });
    return unsubscribe;
  }, [navigation, fetchWholesalerList, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWholesalerList(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchWholesalerList]);

  const renderWholesalerItem = ({ item }) => {
    const balance = item.baqiBaqaya !== undefined ? item.baqiBaqaya : (item.balance || 0);

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('WholesalerDetail', {
            wholesalerId: item._id,
            wholesalerName: item.name,
          })
        }
        activeOpacity={0.75}
      >
        <Card style={styles.wholesalerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name ? item.name.charAt(0).toUpperCase() : '🚛'}
            </Text>
          </View>

          <View style={styles.wholesalerInfo}>
            <View style={styles.wholesalerNameRow}>
              <Text style={styles.wholesalerName}>{item.name}</Text>
            </View>
            {item.phone ? (
              <Text style={styles.wholesalerPhone}>📞 {item.phone}</Text>
            ) : null}

            {balance > 0 ? (
              <Text style={styles.balanceDebit}>
                Dena Hai: <Text style={styles.boldText}>Rs. {balance.toLocaleString()}</Text>
              </Text>
            ) : balance < 0 ? (
              <Text style={styles.balanceCredit}>
                Advance Diya: <Text style={styles.boldText}>Rs. {Math.abs(balance).toLocaleString()}</Text>
              </Text>
            ) : (
              <Text style={styles.balanceNeutral}>Hisaab Saaf (Rs. 0)</Text>
            )}
          </View>

          <View style={styles.cardArrow}>
            <Text style={styles.cardArrowText}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.header}>
        <PrimaryButton
          title="Manage Items"
          icon="📦"
          variant="outline"
          onPress={() => navigation.navigate('ManageWholesalerItems')}
          style={styles.manageItemsButton}
        />

        <PrimaryButton
          title="+ Naya Wholesaler"
          variant="accent"
          onPress={() => navigation.navigate('AddEditWholesaler')}
          style={styles.addButton}
        />
      </View>

      {/* Analytics Summary Card */}
      <View style={styles.analyticsCardWrapper}>
        <Card style={styles.analyticsCard}>
          <View style={styles.analyticsColsRow}>
            {/* Kul Kharedari */}
            <View style={styles.analyticsCol}>
              <Text style={styles.analyticsLabel}>Kul Kharedari</Text>
              <Text style={[styles.analyticsValue, styles.textDebit]}>
                Rs. {(analytics?.totalKharedari || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.analyticsDivider} />

            {/* Kul Payment */}
            <View style={styles.analyticsCol}>
              <Text style={styles.analyticsLabel}>Kul Payment</Text>
              <Text style={[styles.analyticsValue, styles.textCredit]}>
                Rs. {(analytics?.totalPayment || 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Kul Baqaya Highlight Bar */}
          <View style={styles.analyticsHighlightBar}>
            <View style={styles.analyticsHighlightLeft}>
              <Text style={styles.analyticsHighlightIcon}>🚛</Text>
              <Text style={styles.analyticsHighlightLabel}>Total Dena Baqaya:</Text>
            </View>
            <Text
              style={[
                styles.analyticsHighlightValue,
                (analytics?.baqiBaqaya || 0) > 0
                  ? styles.balanceDanger
                  : (analytics?.baqiBaqaya || 0) < 0
                    ? styles.balanceCredit
                    : styles.balanceZero,
              ]}
            >
              Rs. {Math.abs(analytics?.baqiBaqaya || 0).toLocaleString()}
              {(analytics?.baqiBaqaya || 0) > 0
                ? ' (Dena Hai)'
                : (analytics?.baqiBaqaya || 0) < 0
                  ? ' (Advance)'
                  : ' (Saaf)'}
            </Text>
          </View>
        </Card>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search wholesaler by name..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearSearch}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Background Sync Indicator */}
      {isBackgroundUpdating ? (
        <UpdatingIndicator message="Wholesaler list update ho rahi hai..." />
      ) : null}

      {/* Error Banner with Retry Button */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PrimaryButton
            title="🔄 Dobara Koshish Karein (Retry)"
            onPress={() => fetchWholesalerList(searchQuery)}
            variant="danger"
            style={styles.retryButton}
          />
        </View>
      ) : null}

      {/* Wholesaler List */}
      {isLoading ? (
        <LoadingSpinner message="Loading wholesaler list..." />
      ) : (
        <FlatList
          data={wholesalers}
          keyExtractor={(item) => item._id}
          renderItem={renderWholesalerItem}
          contentContainerStyle={
            wholesalers.length === 0 ? styles.emptyListContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchWholesalerList(searchQuery, true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={searchQuery ? '🔍' : '🚛'}
              title={
                searchQuery
                  ? `"${searchQuery}" ke naam se koi wholesaler nahi mila`
                  : 'Abhi koi wholesaler add nahi hua'
              }
              subtitle={
                searchQuery
                  ? 'Spelling check karein ya search clear karein'
                  : 'Upar "+ Naya Wholesaler" button se naya wholesaler add karein'
              }
              actionLabel={searchQuery ? 'Clear Search' : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
              actionVariant="outline"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  manageItemsButton: {
    flex: 1,
    paddingVertical: 12,
  },
  addButton: {
    flex: 1.2,
    paddingVertical: 12,
  },
  analyticsCardWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  analyticsCard: {
    backgroundColor: '#FAF9F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  analyticsColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  analyticsCol: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  analyticsDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  analyticsHighlightBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: 2,
  },
  analyticsHighlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticsHighlightIcon: {
    fontSize: 13,
  },
  analyticsHighlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  analyticsHighlightValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearSearch: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  wholesalerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
  },
  wholesalerInfo: {
    flex: 1,
  },
  wholesalerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wholesalerName: {
    ...typography.h3,
    marginBottom: 2,
  },
  wholesalerPhone: {
    ...typography.bodySmall,
    marginBottom: 4,
  },
  balanceDebit: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 2,
  },
  balanceCredit: {
    fontSize: 13,
    color: colors.success,
    marginTop: 2,
  },
  balanceNeutral: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  boldText: {
    fontWeight: 'bold',
  },
  cardArrow: {
    paddingLeft: spacing.sm,
  },
  cardArrowText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingVertical: 8,
    alignSelf: 'center',
  },
  balanceDanger: {
    color: colors.danger,
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
});
