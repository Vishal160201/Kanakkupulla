import { Font } from '@react-pdf/renderer';
import path from 'path';

let fontsReady = false;

/** Registers the self-hosted fonts once; a missing file falls back to Helvetica instead of failing the PDF. */
export const initFonts = () => {
  if (fontsReady) return;
  fontsReady = true;
  // react-pdf hyphenates long words by default ("IN-VOICE", "PARTIAL-LY"); never split words
  Font.registerHyphenationCallback((word) => [word]);
  try {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    Font.register({
      family: 'Inter',
      fonts: [
        { src: path.join(fontsDir, 'Inter-Regular.ttf'), fontWeight: 400 },
        { src: path.join(fontsDir, 'Inter-SemiBold.ttf'), fontWeight: 600 },
        { src: path.join(fontsDir, 'Inter-Bold.ttf'), fontWeight: 700 },
      ],
    });
    Font.register({
      family: 'Playfair Display',
      fonts: [
        { src: path.join(fontsDir, 'PlayfairDisplay-Regular.ttf'), fontWeight: 400 },
        { src: path.join(fontsDir, 'PlayfairDisplay-Bold.ttf'), fontWeight: 700 },
      ],
    });
    Font.register({ family: 'Great Vibes', src: path.join(fontsDir, 'GreatVibes-Regular.ttf') });
  } catch (error) {
    console.warn('Failed to register invoice fonts, falling back to Helvetica', error);
  }
};

export const colors = {
  page: '#FBF8F3',
  card: '#FFFFFF',
  cardBorder: '#EEE6DA',
  tile: '#F6EFE4',
  ink: '#1F1F1F',
  text: '#3A3A3A',
  muted: '#8A8178',
  gold: '#BF925A',
  goldDeep: '#A87B45',
  goldSoft: '#F4ECDF',
  dark: '#232323',
  darkText: '#E9E2D6',
  zebra: '#FAF6F0',
  rule: '#EFE8DD',
  green: '#2F7D4E',
  greenSoft: '#EEF5EF',
  red: '#C0392B',
  redSoft: '#FBEDEA',
  white: '#FFFFFF',
};

export const typography = {
  sans: 'Inter',
  serif: 'Playfair Display',
  script: 'Great Vibes',
};

export const radius = { sm: 6, md: 10, full: 999 };
