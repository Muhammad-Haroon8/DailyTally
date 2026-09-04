// src/screens/AddItemEntryScreen.js
// Screen to record item credit (Udhaar) entry with consistent design tokens

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
import ItemDropdown from '../components/ItemDropdown';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing } from '../constants/theme';
import { createEntry, updateEntry } from '../api/entryApi';

export default function AddItemEntryScreen({ route, navigation }) {
  const { customerId, customerName, entry } = route.params || {};
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
  const [note, setNote] = useState(entry?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle item selection from reusable ItemDropdown
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setRate(String(item.defaultRate || '0'));
  };

  // Live-calculate total: quantity * rate
  const parsedQty = parseFloat(quantity) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const liveTotal = Math.round(parsedQty * parsedRate * 100) / 100;

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
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
      setErrorMessage('Please select an item from the master catalog');
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

    try {
      setIsSaving(true);
      const payload = {
        customerId,
        type: 'item',
        itemId: selectedItem._id,
        quantity: parsedQty,
        rate: parsedRate,
        note: note.trim(),
        entryDate: date.toISOString(),
        entryTime: timeString,
      };

      if (isEditing) {
        await updateEntry(entry._id, payload);
      } else {
        await createEntry(payload);
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
            {isEditing ? 'Edit Item Entry' : 'Add Item (Udhaar)'}
          </Text>
          <Text style={styles.customerSubtitle}>Gahak: {customerName}</Text>

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
              onChange={handleDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {/* Master Item Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select item *</Text>
            <ItemDropdown
              selectedItem={selectedItem}
              onSelect={handleItemSelect}
              placeholder="Choose Siri, Kaleji, Ogri..."
            />
          </View>

          {/* Quantity & Rate */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantity (Tadad) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10"
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
                placeholder="e.g. 500"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={rate}
                onChangeText={setRate}
                editable={!isSaving}
              />
            </View>
          </View>

          {/* Live Calculated Total */}
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Kul Raqam (Total):</Text>
            <Text style={styles.totalAmount}>Rs. {liveTotal.toLocaleString()}</Text>
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
            title={isEditing ? 'Update Entry' : 'Save Item Entry'}
            variant="accent"
            icon="📦"
            onPress={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
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
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    padding: spacing.xl,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
  },
  customerSubtitle: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  datePickerButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  totalBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  totalAmount: {
    ...typography.amountLarge,
    color: colors.primary,
  },
  saveButton: {
    marginTop: spacing.xs,
  },
});
