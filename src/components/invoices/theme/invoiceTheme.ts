import { Font } from '@react-pdf/renderer';
import path from 'path';

export const initFonts = () => {
  try {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');

    Font.register({
      family: 'Inter',
      fonts: [
        { src: path.join(fontsDir, 'Inter-Regular.ttf'), fontWeight: 400 },
        { src: path.join(fontsDir, 'Inter-SemiBold.ttf'), fontWeight: 600 },
        { src: path.join(fontsDir, 'Inter-Bold.ttf'), fontWeight: 700 }
      ]
    });

    Font.register({
      family: 'Playfair Display',
      fonts: [
        { src: path.join(fontsDir, 'PlayfairDisplay-Regular.ttf'), fontWeight: 400 },
        { src: path.join(fontsDir, 'PlayfairDisplay-Bold.ttf'), fontWeight: 700 }
      ]
    });

    Font.register({
      family: 'Great Vibes',
      src: path.join(fontsDir, 'GreatVibes-Regular.ttf')
    });
  } catch (error) {
    console.warn('Failed to register local fonts, falling back to Helvetica', error);
  }
};

export const colors = {
  background: '#FCF9F3',
  cardBackground: '#FFFFFF',
  primaryText: '#2D2D2D',
  darkBox: '#2C2C2C',
  secondaryText: '#6B7280',
  gold: '#C69C6D',
  goldLight: '#F3EFE9',
  border: '#EBE5DA',
  successGreen: '#10B981',
  pendingOrange: '#C69C6D',
  overdueRed: '#EF4444',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
};

export const layout = {
  pagePadding: 24,
  footerHeight: 40,
  cardBorderWidth: 1,
  headerHeight: 120,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

export const typography = {
  fontFamily: 'Inter',
  serifFamily: 'Playfair Display',
  cursiveFamily: 'Great Vibes',
  sizes: {
    xxs: 6,
    xs: 7,
    sm: 9,
    md: 11,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  }
};
