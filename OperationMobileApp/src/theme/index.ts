export const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  background: '#F2F2F7',
  surface: '#FFFFFF',
  
  text: '#000000',
  textSecondary: '#8E8E93',
  textLight: '#C7C7CC',
  
  border: '#D1D1D6',
  divider: '#E5E5EA',
  
  disabled: '#C7C7CC',
  placeholder: '#8E8E93'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16
  }
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  }
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows
};

export default theme;
