// src/screens/AddPurchaseEntryScreen.js
// Screen to record Wholesaler Purchase Entry with multi-item Extra & Shortage (Kam) adjustments:
// - Main Item & Quantity & Rate -> Base Amount = quantity * rate
// - Section A: "Extra Aya (agar ho)" -> List of { id, item, pieces, rate } with "+ Extra Item Add Karein"
// - Section B: "Kam Aya / Shortage (agar ho)" -> List of { id, item, pieces, rate } with "+ Kam Item Add Karein"
// - Per-row live preview: (pieces / 2) * rate
// - Live Total Amount = Base Amount + sum(Extra rows) - sum(Shortage rows)

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import WholesalerItemDropdown from '../components/WholesalerItemDropdown';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing } from '../constants/theme';
import { createWholesalerEntry, updateWholesalerEntry } from '../api/wholesalerEntryApi';

let rowIdCounter = 1;

export default function AddPurchaseEntryScreen({ route, navigation }) {
  const { wholesalerId, wholesalerName, entry } = route.params || {};
  const isEditing = Boolean(entry);

  const [date, setDate] = useState(entry ? new Date(entry.entryDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeString, setTimeString] = useState(
    entry?.entryTime ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const [selectedItem, setSelectedItem] = useState(
    entry
      ? { _id: entry.itemId, name: entry.itemName, defaultRate: entry.rate }
      : null
  );
  const [quantity, setQuantity] = useState(entry ? String(entry.quantity) : '1');
  const [rate, setRate] = useState(entry ? String(entry.rate) : '');

  // Section A: Extra items list
  const initialExtraItems = () => {
    if (entry && Array.isArray(entry.extraItems) && entry.extraItems.length > 0) {
      return entry.extraItems.map((item) => ({
        id: `extra-${rowIdCounter++}`,
        item: { _id: item.itemId, name: item.itemName, defaultRate: item.rate },
        pieces: String(item.pieces || ''),
        rate: String(item.rate || ''),
      }));
    } else if (entry && entry.extraPieces > 0) {
      // Legacy fallback
      return [{
        id: `extra-${rowIdCounter++}`,
        item: { _id: entry.itemId, name: entry.itemName, defaultRate: entry.extraRate || entry.rate },
        pieces: String(entry.extraPieces),
        rate: String(entry.extraRate || entry.rate),
      }];
    }
    return [];
  };

  // Section B: Shortage items list
  const initialShortageItems = () => {
    if (entry && Array.isArray(entry.shortageItems) && entry.shortageItems.length > 0) {
      return entry.shortageItems.map((item) => ({
        id: `shortage-${rowIdCounter++}`,
        item: { _id: item.itemId, name: item.itemName, defaultRate: item.rate },
        pieces: String(item.pieces || ''),
        rate: String(item.rate || ''),
      }));
    } else if (entry && entry.shortagePieces > 0) {
      // Legacy fallback
      return [{
        id: `shortage-${rowIdCounter++}`,
        item: { _id: entry.itemId, name: entry.itemName, defaultRate: entry.shortageRate || entry.rate },
        pieces: String(entry.shortagePieces),
        rate: String(entry.shortageRate || entry.rate),
      }];
    }
    return [];
  };

  const [extraItems, setExtraItems] = useState(initialExtraItems);
  const [shortageItems, setShortageItems] = useState(initialShortageItems);

  const [note, setNote] = useState(entry?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Main item selection
  const handleMainItemSelect = (item) => {
    setSelectedItem(item);
    const itemRateStr = String(item.defaultRate || '0');
    setRate(itemRateStr);
  };

  // Extra items handlers
  const handleAddExtraRow = () => {
    setExtraItems((prev) => [
      ...prev,
      {
        id: `extra-${rowIdCounter++}`,
        item: null,
        pieces: '',
        rate: rate || '',
      },
    ]);
  };

  const handleRemoveExtraRow = (rowId) => {
    setExtraItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleUpdateExtraRow = (rowId, field, value) => {
    setExtraItems((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (field === 'item') {
          return {
            ...r,
            item: value,
            rate: String(value?.defaultRate || r.rate || rate || '0'),
          };
        }
        return { ...r, [field]: value };
      })
    );
  };

  // Shortage items handlers
  const handleAddShortageRow = () => {
    setShortageItems((prev) => [
      ...prev,
      {
        id: `shortage-${rowIdCounter++}`,
        item: null,
        pieces: '',
        rate: rate || '',
      },
    ]);
  };

  const handleRemoveShortageRow = (rowId) => {
    setShortageItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleUpdateShortageRow = (rowId, field, value) => {
    setShortageItems((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (field === 'item') {
          return {
            ...r,
            item: value,
            rate: String(value?.defaultRate || r.rate || rate || '0'),
          };
        }
        return { ...r, [field]: value };
      })
    );
  };

  // Base Amount calculation
  const parsedQty = parseFloat(quantity) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const liveBaseAmount = Math.round(parsedQty * parsedRate * 100) / 100;

  // Extra Items total calculation
  const extraRowsWithAmounts = extraItems.map((row) => {
    const pcs = parseFloat(row.pieces) || 0;
    const rt = parseFloat(row.rate) || 0;
    const amt = pcs > 0 ? Math.round((pcs / 2) * rt * 100) / 100 : 0;
    return { ...row, parsedPcs: pcs, parsedRt: rt, rowAmount: amt };
  });

  const liveExtraTotal = extraRowsWithAmounts.reduce(
    (sum, r) => sum + r.rowAmount,
    0
  );

  // Shortage Items total calculation
  const shortageRowsWithAmounts = shortageItems.map((row) => {
    const pcs = parseFloat(row.pieces) || 0;
    const rt = parseFloat(row.rate) || 0;
    const amt = pcs > 0 ? Math.round((pcs / 2) * rt * 100) / 100 : 0;
    return { ...row, parsedPcs: pcs, parsedRt: rt, rowAmount: amt };
  });

  const liveShortageTotal = shortageRowsWithAmounts.reduce(
    (sum, r) => sum + r.rowAmount,
    0
  );

  // Final Total calculation: Base + Extra Total - Shortage Total
  let liveFinalAmount = Math.round((liveBaseAmount + liveExtraTotal - liveShortageTotal) * 100) / 100;
  if (liveFinalAmount < 0) liveFinalAmount = 0;

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) {
      setDate(selectedDate);
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
      setTimeString(formatted);
    }
  };

  const handleSave = async () => {
    setErrorMessage('');

    if (!selectedItem) {
      setErrorMessage('Please select an item from the wholesaler catalog');
      return;
    }

    if (parsedQty <= 0) {
      setErrorMessage('Quantity must be greater than 0');
      return;
    }

    if (parsedRate < 0) {
      setErrorMessage('Rate cannot be negative');
      return;
    }

    // Validate extra rows
    const payloadExtraItems = [];
    for (let i = 0; i < extraItems.length; i++) {
      const row = extraItems[i];
      if (!row.item) {
        setErrorMessage(`Extra row #${i + 1} me item chunein ya row hata dein`);
        return;
      }
      const pcs = parseFloat(row.pieces);
      if (isNaN(pcs) || pcs <= 0) {
        setErrorMessage(`Extra row #${i + 1} (${row.item.name}) ki pieces darj karein`);
        return;
      }
      const rt = parseFloat(row.rate);
      if (isNaN(rt) || rt < 0) {
        setErrorMessage(`Extra row #${i + 1} (${row.item.name}) ka rate darj karein`);
        return;
      }
      payloadExtraItems.push({
        itemId: row.item._id,
        pieces: pcs,
        rate: rt,
      });
    }

    // Validate shortage rows
    const payloadShortageItems = [];
    for (let i = 0; i < shortageItems.length; i++) {
      const row = shortageItems[i];
      if (!row.item) {
        setErrorMessage(`Kam row #${i + 1} me item chunein ya row hata dein`);
        return;
      }
      const pcs = parseFloat(row.pieces);
      if (isNaN(pcs) || pcs <= 0) {
        setErrorMessage(`Kam row #${i + 1} (${row.item.name}) ki pieces darj karein`);
        return;
      }
      const rt = parseFloat(row.rate);
      if (isNaN(rt) || rt < 0) {
        setErrorMessage(`Kam row #${i + 1} (${row.item.name}) ka rate darj karein`);
        return;
      }
      payloadShortageItems.push({
        itemId: row.item._id,
        pieces: pcs,
        rate: rt,
      });
    }

    try {
      setIsSaving(true);
      const payload = {
        wholesalerId,
        type: 'purchase',
        itemId: selectedItem._id,
        quantity: parsedQty,
        rate: parsedRate,
        extraItems: payloadExtraItems,
        shortageItems: payloadShortageItems,
        note: note.trim(),
        entryDate: date.toISOString(),
        entryTime: timeString,
      };

      if (isEditing) {
        await updateWholesalerEntry(entry._id, payload);
      } else {
        await createWholesalerEntry(payload);
      }

      navigation.goBack();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Purchase Entry' : 'Purchase Add Karein'}
          </Text>
          <Text style={styles.subtitle}>Wholesaler: {wholesalerName}</Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Date & Time Selectors */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  📅 {date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.datePickerText}>⏰ {timeString}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onValueChange={handleDateChange}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onValueChange={handleTimeChange}
              onDismiss={() => setShowTimePicker(false)}
            />
          )}

          {/* Wholesaler Purchase Item Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Main Item *</Text>
            <WholesalerItemDropdown
              selectedItem={selectedItem}
              onSelect={handleMainItemSelect}
              placeholder="Choose Siri Jore, Kaleji, Ogri..."
            />
          </View>

          {/* Quantity & Rate */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantity (Tadad) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 20"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                editable={!isSaving}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Rate (Rs.) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 850"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={rate}
                onChangeText={setRate}
                editable={!isSaving}
              />
            </View>
          </View>

          {/* Live Base Amount Display */}
          <View style={styles.baseAmountBox}>
            <Text style={styles.baseAmountLabel}>Base Amount (Qty × Rate):</Text>
            <Text style={styles.baseAmountValue}>
              Rs. {liveBaseAmount.toLocaleString()}
            </Text>
          </View>

          {/* ==================================================================== */}
          {/* Section A: Multi-Item Extra Aya (agar ho) */}
          {/* ==================================================================== */}
          <View style={styles.extraSectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithBadgeRow}>
                <Text style={styles.extraSectionTitle}>➕ Extra Aya (agar ho)</Text>
                {extraItems.length > 0 && (
                  <View style={styles.activeBadgeExtra}>
                    <Text style={styles.activeBadgeTextExtra}>
                      {extraItems.length} {extraItems.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.addAdjustmentButtonExtra}
                onPress={handleAddExtraRow}
                activeOpacity={0.8}
              >
                <Text style={styles.addAdjustmentButtonTextExtra}>+ Extra Item</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionSubtitle}>
              Sath me ane wale loose/extra items (Pieces ÷ 2 × Rate)
            </Text>

            {extraRowsWithAmounts.length === 0 ? (
              <Text style={styles.emptyAdjustmentHint}>
                Koi extra item nahi hai. Agar delivery me extra pieces aye hon to "+ Extra Item" dabayein.
              </Text>
            ) : (
              extraRowsWithAmounts.map((row, index) => (
                <View key={row.id} style={styles.adjustmentRowCardExtra}>
                  <View style={styles.adjustmentRowHeader}>
                    <Text style={styles.adjustmentRowIndexTextExtra}>
                      Extra Item #{index + 1}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeRowButton}
                      onPress={() => handleRemoveExtraRow(row.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.removeRowButtonText}>✕ Hataen</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row Item Dropdown */}
                  <View style={styles.rowDropdownWrap}>
                    <WholesalerItemDropdown
                      selectedItem={row.item}
                      onSelect={(chosenItem) =>
                        handleUpdateExtraRow(row.id, 'item', chosenItem)
                      }
                      placeholder="Extra item chunein (e.g. Siri, Jore)..."
                    />
                  </View>

                  {/* Row Pieces & Rate Inputs */}
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                      <Text style={styles.subLabel}>Pieces</Text>
                      <TextInput
                        style={styles.subInput}
                        placeholder="e.g. 10"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={row.pieces}
                        onChangeText={(val) =>
                          handleUpdateExtraRow(row.id, 'pieces', val)
                        }
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                      <Text style={styles.subLabel}>Rate (Rs.)</Text>
                      <TextInput
                        style={styles.subInput}
                        placeholder="e.g. 850"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={row.rate}
                        onChangeText={(val) =>
                          handleUpdateExtraRow(row.id, 'rate', val)
                        }
                      />
                    </View>
                  </View>

                  {/* Row Calculation */}
                  <View style={styles.rowCalcBarExtra}>
                    <Text style={styles.rowFormulaText}>
                      ({row.parsedPcs} pcs ÷ 2) × Rs.{row.parsedRt} =
                    </Text>
                    <Text style={styles.rowAmountTextExtra}>
                      + Rs. {row.rowAmount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {extraRowsWithAmounts.length > 0 && (
              <View style={styles.subtotalBarExtra}>
                <Text style={styles.subtotalLabelExtra}>Kul Extra Raqam:</Text>
                <Text style={styles.subtotalValueExtra}>
                  + Rs. {liveExtraTotal.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* ==================================================================== */}
          {/* Section B: Multi-Item Kam Aya / Shortage (agar ho) */}
          {/* ==================================================================== */}
          <View style={styles.shortageSectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithBadgeRow}>
                <Text style={styles.shortageSectionTitle}>➖ Kam Aya / Shortage (agar ho)</Text>
                {shortageItems.length > 0 && (
                  <View style={styles.activeBadgeShortage}>
                    <Text style={styles.activeBadgeTextShortage}>
                      {shortageItems.length} {shortageItems.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.addAdjustmentButtonShortage}
                onPress={handleAddShortageRow}
                activeOpacity={0.8}
              >
                <Text style={styles.addAdjustmentButtonTextShortage}>+ Kam Item</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionSubtitle}>
              Delivery me kam ane wale items (Pieces ÷ 2 × Rate)
            </Text>

            {shortageRowsWithAmounts.length === 0 ? (
              <Text style={styles.emptyAdjustmentHint}>
                Koi shortage nahi hai. Agar pieces kam aye hon to "+ Kam Item" dabayein.
              </Text>
            ) : (
              shortageRowsWithAmounts.map((row, index) => (
                <View key={row.id} style={styles.adjustmentRowCardShortage}>
                  <View style={styles.adjustmentRowHeader}>
                    <Text style={styles.adjustmentRowIndexTextShortage}>
                      Kam Item #{index + 1}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeRowButton}
                      onPress={() => handleRemoveShortageRow(row.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.removeRowButtonText}>✕ Hataen</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row Item Dropdown */}
                  <View style={styles.rowDropdownWrap}>
                    <WholesalerItemDropdown
                      selectedItem={row.item}
                      onSelect={(chosenItem) =>
                        handleUpdateShortageRow(row.id, 'item', chosenItem)
                      }
                      placeholder="Kam item chunein (e.g. Siri, Jore)..."
                    />
                  </View>

                  {/* Row Pieces & Rate Inputs */}
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                      <Text style={styles.subLabel}>Pieces</Text>
                      <TextInput
                        style={styles.subInput}
                        placeholder="e.g. 5"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={row.pieces}
                        onChangeText={(val) =>
                          handleUpdateShortageRow(row.id, 'pieces', val)
                        }
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                      <Text style={styles.subLabel}>Rate (Rs.)</Text>
                      <TextInput
                        style={styles.subInput}
                        placeholder="e.g. 850"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        value={row.rate}
                        onChangeText={(val) =>
                          handleUpdateShortageRow(row.id, 'rate', val)
                        }
                      />
                    </View>
                  </View>

                  {/* Row Calculation */}
                  <View style={styles.rowCalcBarShortage}>
                    <Text style={styles.rowFormulaText}>
                      ({row.parsedPcs} pcs ÷ 2) × Rs.{row.parsedRt} =
                    </Text>
                    <Text style={styles.rowAmountTextShortage}>
                      − Rs. {row.rowAmount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {shortageRowsWithAmounts.length > 0 && (
              <View style={styles.subtotalBarShortage}>
                <Text style={styles.subtotalLabelShortage}>Kul Kam Raqam:</Text>
                <Text style={styles.subtotalValueShortage}>
                  − Rs. {liveShortageTotal.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* ==================================================================== */}
          {/* Final Live Calculated Total Breakdown */}
          {/* ==================================================================== */}
          <View style={styles.finalTotalCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Base Amount (Qty × Rate):</Text>
              <Text style={styles.breakdownVal}>Rs. {liveBaseAmount.toLocaleString()}</Text>
            </View>

            {/* List individual Extra items in breakdown if any */}
            {extraRowsWithAmounts
              .filter((r) => r.rowAmount > 0)
              .map((r, i) => (
                <View key={`b-extra-${i}`} style={styles.breakdownSubRow}>
                  <Text style={styles.breakdownSubLabel}>
                    + Extra ({r.item?.name || 'Item'} {r.parsedPcs} pcs @ {r.parsedRt}):
                  </Text>
                  <Text style={[styles.breakdownSubVal, styles.adjTextExtra]}>
                    + Rs. {r.rowAmount.toLocaleString()}
                  </Text>
                </View>
              ))}

            {/* List individual Shortage items in breakdown if any */}
            {shortageRowsWithAmounts
              .filter((r) => r.rowAmount > 0)
              .map((r, i) => (
                <View key={`b-short-${i}`} style={styles.breakdownSubRow}>
                  <Text style={styles.breakdownSubLabel}>
                    − Kam ({r.item?.name || 'Item'} {r.parsedPcs} pcs @ {r.parsedRt}):
                  </Text>
                  <Text style={[styles.breakdownSubVal, styles.adjTextShortage]}>
                    − Rs. {r.rowAmount.toLocaleString()}
                  </Text>
                </View>
              ))}

            <View style={styles.totalDivider} />

            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Kul Raqam (Total Amount):</Text>
              <Text style={styles.finalTotalAmount}>
                Rs. {liveFinalAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Note / Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note / Tafseel (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Koi khaas baat..."
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              editable={!isSaving}
            />
          </View>

          <PrimaryButton
            title={isEditing ? 'Update Purchase' : 'Save Purchase Entry'}
            variant="danger"
            icon="📦"
            onPress={handleSave}
            isLoading={isSaving}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  subInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  baseAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  baseAmountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  baseAmountValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  extraSectionCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  shortageSectionCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  extraSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: '#92400E',
  },
  shortageSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
  },
  activeBadgeExtra: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeTextExtra: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  activeBadgeShortage: {
    backgroundColor: '#FECACA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeTextShortage: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
  },
  addAdjustmentButtonExtra: {
    backgroundColor: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addAdjustmentButtonTextExtra: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addAdjustmentButtonShortage: {
    backgroundColor: colors.error,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addAdjustmentButtonTextShortage: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyAdjustmentHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  adjustmentRowCardExtra: {
    backgroundColor: '#FEF9EE',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  adjustmentRowCardShortage: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  adjustmentRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  adjustmentRowIndexTextExtra: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  adjustmentRowIndexTextShortage: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  removeRowButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  removeRowButtonText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },
  rowDropdownWrap: {
    marginBottom: 8,
  },
  rowCalcBarExtra: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    paddingTop: 4,
  },
  rowCalcBarShortage: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    paddingTop: 4,
  },
  rowFormulaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  rowAmountTextExtra: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  rowAmountTextShortage: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  subtotalBarExtra: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FCD34D',
  },
  subtotalLabelExtra: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  subtotalValueExtra: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  subtotalBarShortage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
  },
  subtotalLabelShortage: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  subtotalValueShortage: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  finalTotalCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  breakdownVal: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  breakdownSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    paddingLeft: 8,
  },
  breakdownSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 6,
  },
  breakdownSubVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  adjTextExtra: {
    color: '#B45309',
  },
  adjTextShortage: {
    color: colors.error,
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.xs,
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  finalTotalLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  finalTotalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
  },
});
