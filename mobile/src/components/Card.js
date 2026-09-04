// src/components/Card.js
// Reusable card container component with consistent radius, padding, border and subtle elevation

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { cardStyles } from '../constants/theme';

export default function Card({ children, style, ...props }) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardStyles,
  },
});
