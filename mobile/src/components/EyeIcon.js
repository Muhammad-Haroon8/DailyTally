// src/components/EyeIcon.js
// Custom lightweight SVG/vector eye icon without relying on native font bundling

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export default function EyeIcon({ visible = false, size = 22, color = colors.textSecondary }) {
  return (
    <View style={[styles.container, { width: size + 4, height: size }]}>
      {/* Outer eye contour */}
      <View
        style={[
          styles.outerEye,
          {
            borderColor: color,
            width: size + 2,
            height: Math.round(size * 0.65),
            borderRadius: Math.round(size * 0.35),
          },
        ]}
      >
        {/* Pupil */}
        <View
          style={[
            styles.pupil,
            {
              backgroundColor: color,
              width: Math.round(size * 0.35),
              height: Math.round(size * 0.35),
              borderRadius: Math.round(size * 0.2),
            },
          ]}
        />
      </View>

      {/* Slashed line across when hidden */}
      {!visible && (
        <View
          style={[
            styles.slash,
            {
              backgroundColor: color,
              width: size + 6,
              height: 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerEye: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pupil: {},
  slash: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },
});
