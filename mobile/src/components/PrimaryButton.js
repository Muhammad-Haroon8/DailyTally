// src/components/PrimaryButton.js
// Reusable button component supporting color variants, built-in loading spinner, and double-submit protection

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors, spacing } from '../constants/theme';

/**
 * Reusable Button
 * @param {Object} props
 * @param {string} props.title - Button text
 * @param {Function} props.onPress - Click handler
 * @param {'primary' | 'accent' | 'success' | 'danger' | 'outline'} [props.variant='primary']
 * @param {boolean} [props.isLoading=false] - Shows spinner
 * @param {boolean} [props.disabled=false]
 * @param {Object} [props.style]
 * @param {Object} [props.textStyle]
 */
export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  ...props
}) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'accent':
        return colors.accent;
      case 'success':
        return colors.success;
      case 'danger':
        return colors.danger;
      case 'outline':
        return 'transparent';
      case 'primary':
      default:
        return colors.primary;
    }
  };

  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        isOutline && styles.outlineButton,
        (disabled || isLoading) && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.82}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={isOutline ? colors.primary : '#FFFFFF'}
          size="small"
        />
      ) : (
        <>
          {icon ? <Text style={styles.iconStyle}>{icon} </Text> : null}
          <Text
            style={[
              styles.text,
              isOutline ? styles.outlineText : styles.solidText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButton: {
    opacity: 0.65,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  solidText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: colors.textPrimary,
  },
  iconStyle: {
    fontSize: 16,
    marginRight: 4,
    flexShrink: 0,
  },
});
