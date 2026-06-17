// Design tokens for SmartDukaan
export const Colors = {
  // Backgrounds
  bg: '#080B14',
  bgSecondary: '#0D1117',
  surface: '#111827',
  surfaceHigh: '#1C2333',
  border: '#1F2D40',
  borderLight: '#2A3A50',

  // Brand
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#4F46E5',
  primaryGlow: 'rgba(108, 99, 255, 0.15)',

  // Accent
  accent: '#00D9A5',
  accentLight: '#34EEC0',
  accentGlow: 'rgba(0, 217, 165, 0.15)',

  // Semantic
  success: '#22C55E',
  successGlow: 'rgba(34, 197, 94, 0.15)',
  warning: '#FF9F43',
  warningGlow: 'rgba(255, 159, 67, 0.15)',
  error: '#EF4444',
  errorGlow: 'rgba(239, 68, 68, 0.15)',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDisabled: '#374151',

  // Gradients
  gradientPrimary: ['#6C63FF', '#4F46E5'] as const,
  gradientAccent: ['#00D9A5', '#0EA5E9'] as const,
  gradientDark: ['#111827', '#080B14'] as const,
  gradientCard: ['rgba(28, 35, 51, 0.8)', 'rgba(17, 24, 39, 0.6)'] as const,

  // Glass
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 42,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
