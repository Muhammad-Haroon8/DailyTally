// src/components/SendReportModal.js
// Modal allowing user to select date range ("Is Hafte Ka", "Is Mahine Ka", "Custom Range"),
// generate PDF statement, and share via native OS share sheet or download locally.

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import { colors, typography, spacing } from '../constants/theme';
import { downloadReportPdf } from '../api/reportApi';

export default function SendReportModal({
  visible,
  onClose,
  customerId,
  customerName,
}) {
  const [rangeType, setRangeType] = useState('month'); // 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState(null); // 'share' | 'download'
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate actual startDate and endDate strings (YYYY-MM-DD)
  const computeDateRange = () => {
    const today = new Date();

    if (rangeType === 'week') {
      // Monday through today (or current week)
      const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday);

      return {
        start: monday.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    }

    if (rangeType === 'month') {
      // 1st of current month through today
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: firstOfMonth.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    }

    // Custom Range
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  };

  const handleGenerate = async (mode) => {
    setErrorMessage('');
    const { start, end } = computeDateRange();

    if (new Date(start) > new Date(end)) {
      setErrorMessage('Start date, End date se aage nahi ho sakti.');
      return;
    }

    try {
      setIsProcessing(true);
      setActionType(mode);

      // 1. Download & save PDF locally
      const localFileUri = await downloadReportPdf(customerId, start, end, customerName);

      if (mode === 'share') {
        // 2. Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert(
            'Sharing Not Available',
            'Aapke device par direct sharing support nahi hai. File save ho chuki hai.'
          );
          onClose();
          return;
        }

        // 3. Open native share sheet (user picks WhatsApp, Email, etc.)
        await Sharing.shareAsync(localFileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${customerName} Ka Hisab Report`,
          UTI: 'com.adobe.pdf',
        });

        onClose();
      } else {
        // Mode === 'download'
        Alert.alert(
          'PDF Save Ho Gaya! ✅',
          `Report kamyabi se save ho chuki hai:\n\n${localFileUri.split('/').pop()}`,
          [{ text: 'Theek Hai', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Report error:', error);
      setErrorMessage(error.message || 'Report banane me khata aayi.');
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>📄 Report Bhejein (PDF)</Text>
              <Text style={styles.modalSubtitle}>Gahak: {customerName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isProcessing} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Range Options */}
          <Text style={styles.sectionLabel}>Hisab Ka Arsa Chunein:</Text>

          {/* Option 1: Is Mahine Ka */}
          <TouchableOpacity
            style={[styles.optionCard, rangeType === 'month' && styles.optionCardSelected]}
            onPress={() => setRangeType('month')}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <View style={styles.optionRadioWrap}>
              <View style={[styles.radioCircle, rangeType === 'month' && styles.radioCircleSelected]} />
              <View>
                <Text style={styles.optionTitle}>Is Mahine Ka Hisab</Text>
                <Text style={styles.optionDesc}>1st date se le kar aaj tak ka poora hisab</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Option 2: Is Hafte Ka */}
          <TouchableOpacity
            style={[styles.optionCard, rangeType === 'week' && styles.optionCardSelected]}
            onPress={() => setRangeType('week')}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <View style={styles.optionRadioWrap}>
              <View style={[styles.radioCircle, rangeType === 'week' && styles.radioCircleSelected]} />
              <View>
                <Text style={styles.optionTitle}>Is Hafte Ka Hisab</Text>
                <Text style={styles.optionDesc}>Monday se le kar aaj tak ka hisab</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Option 3: Custom Range */}
          <TouchableOpacity
            style={[styles.optionCard, rangeType === 'custom' && styles.optionCardSelected]}
            onPress={() => setRangeType('custom')}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <View style={styles.optionRadioWrap}>
              <View style={[styles.radioCircle, rangeType === 'custom' && styles.radioCircleSelected]} />
              <View>
                <Text style={styles.optionTitle}>Custom Range (Apni Marzi Ke Din)</Text>
                <Text style={styles.optionDesc}>Koi bhi do tareekhon ke darmiyan ka hisab</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Custom Date Pickers */}
          {rangeType === 'custom' && (
            <View style={styles.customDateContainer}>
              <View style={styles.datePickerRow}>
                <View style={styles.pickerBox}>
                  <Text style={styles.datePickerLabel}>Kahan Se (From):</Text>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setShowStartPicker(true)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.pickerBtnText}>
                      📅 {startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.pickerBox}>
                  <Text style={styles.datePickerLabel}>Kahan Tak (To):</Text>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setShowEndPicker(true)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.pickerBtnText}>
                      📅 {endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onValueChange={(event, date) => {
                    setShowStartPicker(false);
                    if (event?.type === 'dismissed') return;
                    if (date) setStartDate(date);
                  }}
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (event?.type === 'dismissed') return;
                    if (date) setStartDate(date);
                  }}
                  onDismiss={() => setShowStartPicker(false)}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onValueChange={(event, date) => {
                    setShowEndPicker(false);
                    if (event?.type === 'dismissed') return;
                    if (date) setEndDate(date);
                  }}
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (event?.type === 'dismissed') return;
                    if (date) setEndDate(date);
                  }}
                  onDismiss={() => setShowEndPicker(false)}
                />
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Primary: Generate & Share */}
            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleGenerate('share')}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing && actionType === 'share' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>📤 Generate & Share (WhatsApp/Email)</Text>
              )}
            </TouchableOpacity>

            {/* Secondary: Download Only */}
            <TouchableOpacity
              style={[styles.secondaryButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleGenerate('download')}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing && actionType === 'download' ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.secondaryButtonText}>📥 Sirf Download Karein (Save Only)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
    padding: 4,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  optionCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionRadioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioCircleSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  customDateContainer: {
    marginTop: 2,
    marginBottom: spacing.sm,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerBox: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  pickerBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  pickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
