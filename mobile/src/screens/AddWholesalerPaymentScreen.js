// src/screens/AddWholesalerPaymentScreen.js
// Screen to record payment made by the shop to a Wholesaler (reduces debt owed to supplier)

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

export default function AddWholesalerPaymentScreen({ route, navigation }) {
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
      setErrorMessage('Please enter a valid payment amount greater than 0');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        wholesalerId,
        type: 'payment',
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
            {isEditing ? 'Edit Wholesaler Payment' : 'Payment Karein'}
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

          {/* Payment Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ada Ki Gayi Raqam (Payment Amount in Rs.) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              editable={!isSaving}
              autoFocus={!isEditing}
            />
          </View>

          {/* Note / Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note / Tafseel (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cash diya / Bank transfer..."
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              editable={!isSaving}
            />
          </View>

          <PrimaryButton
            title={isEditing ? 'Update Payment' : 'Save Payment'}
            variant="success"
            icon="💵"
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
});
