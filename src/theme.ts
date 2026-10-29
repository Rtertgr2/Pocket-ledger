/** Design tokens. Screens never invent hex codes — they take a palette from `useTheme()`. */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  text: string;
  muted: string;
  income: string;
  expense: string;
  transfer: string;
  /** Text/icons drawn on top of `primary` (the total-balance card, filled buttons). */
  onPrimary: string;
  onPrimaryMuted: string;
  /** Inverted pair for the toast, so a confirmation reads in both schemes. */
  overlayBg: string;
  overlayText: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#F4F6F8',
    surface: '#FFFFFF',
    surfaceMuted: '#EDF1F4',
    border: '#E2E8ED',
    primary: '#2E7D32',
    primarySoft: '#E6F2E7',
    text: '#16202A',
    muted: '#68757F',
    income: '#2E7D32',
    expense: '#C33C3C',
    transfer: '#2B6CB0',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: 'rgba(255,255,255,0.8)',
    overlayBg: '#16202A',
    overlayText: '#FFFFFF',
  },
  dark: {
    bg: '#0F1214',
    surface: '#191E22',
    surfaceMuted: '#232A30',
    border: '#2B343B',
    primary: '#3E9B46',
    primarySoft: '#1C2E20',
    text: '#EDF1F4',
    muted: '#93A0AB',
    income: '#5DBE62',
    expense: '#EF6B6B',
    transfer: '#68A7E6',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: 'rgba(255,255,255,0.78)',
    overlayBg: '#E8EDF1',
    overlayText: '#101417',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

/** Colours an account card may use. Mid-tone so they read on both backgrounds. */
export const ACCOUNT_COLORS = ['#2E7D32', '#2B6CB0', '#C33C3C', '#B7791F', '#6B46C1', '#0F766E'] as const;
