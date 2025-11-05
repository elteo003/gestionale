/**
 * Tailwind Theme Configuration
 * 
 * Estende il tema Tailwind con il nostro Design System
 */

import { colors, typography, spacing, borderRadius, shadows, breakpoints, zIndex } from './theme';

export const tailwindTheme = {
  extend: {
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      success: colors.semantic.success,
      error: colors.semantic.error,
      warning: colors.semantic.warning,
      info: colors.semantic.info,
      neutral: colors.neutral,
    },
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    spacing: spacing,
    borderRadius: borderRadius,
    boxShadow: shadows,
    screens: breakpoints,
    zIndex: zIndex,
  },
};

