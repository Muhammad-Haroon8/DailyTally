// src/screens/AddWholesalerAdvanceScreen.js
// Screen to record money given to a Wholesaler in Advance (reduces debt owed or creates advance credit)

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
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, typography, spacing } from '../constants/theme';
import { createWholesalerEntry, updateWholesalerEntry } from '../api/wholesalerEntryApi';

export default function AddWholesalerAdvanceScreen({ route, navigation }) {
  const { wholesalerId, wholesalerName, entry } = route.params || {};
  const isEditing = Boolean(entry);

  const [date, setDate] = useState(entry ? new Date(entry.entryDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeString, setTimeString] = useState(
    entry?.entryTime ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [note, setNote] = useState(entry?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Barae meherbani durust advance raqam darj karein (0 se zyada)');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        wholesalerId,
        type: 'advance',
        amount: parsedAmount,
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
      setErrorMessage(error.message || 'Advance save karne me masla pesh aaya');
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
        <Card style={styles.formCard}>
          {/* Wholesaler Name Banner */}
          <View style={styles.wholesalerBanner}>
            <Text style={styles.wholesalerBannerLabel}>Wholesaler / Supplier:</Text>
            <Text style={styles.wholesalerBannerName}>{wholesalerName || 'Wholesaler'}</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Advance Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Advance Raqam (Rs.) *</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              autoFocus={!isEditing}
            />
          </View>

          {/* Date Picker Row */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tareekh (Date)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                📅 {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Time Picker Row */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Waqt (Time)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.pickerButtonText}>⏰ {timeString}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={date}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Wazahat / Note (Ikhtiyari)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Maslan: Delivery se pehle diya gaya advance, Bank transfer..."
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <PrimaryButton
              title={isSaving ? 'Save ho raha hai...' : isEditing ? 'Advance Update Karein' : 'Advance Save Karein'}
              onPress={handleSave}
              disabled={isSaving}
              style={styles.saveBtn}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Wapas (Cancel)</Text>
            </TouchableOpacity>
          </View>
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
    padding: spacing.lg,
  },
  formCard: {
    padding: spacing.xl,
  },
  wholesalerBanner: {
    backgroundColor: '#FFF8E1', // warm gold/amber
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  wholesalerBannerLabel: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '600',
  },
  wholesalerBannerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E65100',
    paddingVertical: spacing.md,
  },
  pickerButton: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  noteInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  buttonContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  saveBtn: {
    backgroundColor: '#E65100', // Distinct warm deep amber for Advance
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
