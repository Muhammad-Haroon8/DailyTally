// src/components/ItemDropdown.js
// Reusable dropdown/picker modal component for selecting an item from the master catalog

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
import { colors } from '../constants/theme';
import { getItems } from '../api/itemApi';

/**
 * Reusable dropdown component
 * @param {Object} props
 * @param {Object} [props.selectedItem] - Current item selected { _id, name, defaultRate }
 * @param {Function} props.onSelect - Callback with full item object when chosen
 * @param {string} [props.placeholder='Select Item']
 * @param {Array} [props.items] - Pre-fetched items array (optional; will fetch if not supplied)
 */
export default function ItemDropdown({
  selectedItem,
  onSelect,
  placeholder = 'Select Item (e.g. Siri, Kaleji)',
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
        const data = await getItems();
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
            ? `${selectedItem.name} (Rs. ${selectedItem.defaultRate})`
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
              <Text style={styles.modalTitle}>Choose Item</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading items...</Text>
              </View>
            ) : errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item._id}
                contentContainerStyle={
                  items.length === 0 ? styles.emptyContainer : styles.listContent
                }
                renderItem={({ item }) => {
                  const isSelected = selectedItem?._id === item._id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.itemOption,
                        isSelected && styles.selectedOption,
                      ]}
                      onPress={() => handleSelectItem(item)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text
                          style={[
                            styles.optionName,
                            isSelected && styles.selectedText,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.optionRate}>
                          Rate: Rs. {item.defaultRate}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Text style={styles.checkmark}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No items available</Text>
                    <Text style={styles.emptySubtitle}>
                      Add items in the Manage Items catalog first.
                    </Text>
                  </View>
                }
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontWeight: 'normal',
  },
  arrowIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: 280,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  itemOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: colors.primaryLight,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  selectedText: {
    color: colors.primary,
  },
  optionRate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
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
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FDE8E8',
    borderRadius: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});
