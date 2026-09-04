// src/constants/theme.js
// Central Design System tokens for Karobar Hisab

export const colors = {
  primary: "#0F6E56",       // Headers, primary buttons, brand emerald
  primaryLight: "#E1F5EE",  // Card tints, selected pill states
  accent: "#BA7517",        // "Add Item" / Udhaar actions (warm amber)
  accentLight: "#FEF3E2",   // Accent badge background
  success: "#3B6D11",       // "Wasool Raqam" / Payment actions (rich green)
  successLight: "#EAF5DE",  // Success badge background
  danger: "#A32D2D",        // Outstanding balance, delete actions, warnings
  dangerLight: "#FDE8E8",   // Danger badge background
  background: "#F8F7F4",    // App background (soft warm gray)
  cardBackground: "#FFFFFF",// Cards, modals, containers
  textPrimary: "#2C2C2A",   // Main text
  textSecondary: "#5F5E5A", // Dates, subtitles, labels
  border: "#E5E3DC",        // Card borders, dividers
};

export const typography = {
  h1: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  amountLarge: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  amountMedium: {
    fontSize: 18,
    fontWeight: 'bold',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const cardStyles = {
  borderRadius: 16,
  padding: 14,
  backgroundColor: colors.cardBackground,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
};
