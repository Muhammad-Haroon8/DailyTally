// src/components/WholesalerItemDropdown.js
// Reusable dropdown/picker modal component for selecting an item from the Wholesaler Purchase Catalog
// Independent of the Customer module's ItemDropdown

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing } from '../constants/theme';
import { getWholesalerItems } from '../api/wholesalerItemApi';

/**
 * WholesalerItemDropdown component
 * @param {Object} props
 * @param {Object} [props.selectedItem] - Current item selected { _id, name, defaultRate }
 * @param {Function} props.onSelect - Callback with full wholesaler item object when chosen
 * @param {string} [props.placeholder='Select Wholesaler Item']
 * @param {Array} [props.items] - Pre-fetched wholesaler items array (optional; will fetch if not supplied)
 */
export default function WholesalerItemDropdown({
  selectedItem,
  onSelect,
  placeholder = 'Select Purchase Item (e.g. Siri Jore, Kaleji)',
  items: preloadedItems,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState(preloadedItems || []);
  const [isLoading, setIsLoading] = useState(!preloadedItems);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (preloadedItems) {
      setItems(preloadedItems);
      return;
    }

    const loadItems = async () => {
      try {
        setIsLoading(true);
        const data = await getWholesalerItems();
        setItems(data);
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [preloadedItems]);

  const handleSelectItem = (item) => {
    if (onSelect) {
      onSelect(item);
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Dropdown trigger box */}
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedItem && styles.placeholderText,
          ]}
        >
          {selectedItem
            ? `${selectedItem.name} (Rate: Rs. ${selectedItem.defaultRate})`
            : placeholder}
        </Text>
        <Text style={styles.arrowIcon}>▼</Text>
      </TouchableOpacity>

      {/* Item picker modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wholesaler Item Chunein</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Items load ho rahe hain...</Text>
              </View>
            ) : errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>Koi Wholesaler Item nahi hai</Text>
                <Text style={styles.emptySubtitle}>
                  Pehle "Manage Items" se wholesaler purchase items aur unke rates add karein.
                </Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isSelected = selectedItem && selectedItem._id === item._id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.itemRow,
                        isSelected && styles.itemRowSelected,
                      ]}
                      onPress={() => handleSelectItem(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.itemRowLeft}>
                        <Text style={styles.itemRowIcon}>🥩</Text>
                        <Text
                          style={[
                            styles.itemRowName,
                            isSelected && styles.itemRowNameSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <View style={styles.itemRowRight}>
                        <Text style={styles.itemRowRate}>
                          Rs. {item.defaultRate}
                        </Text>
                        {isSelected && (
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.cardBackground,
    minHeight: 48,
  },
  triggerText: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  arrowIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: '40%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  itemRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  itemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemRowIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  itemRowName: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  itemRowNameSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  itemRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRowRate: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  checkmarkIcon: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
});
