/** Design tokens. Screens never invent hex codes — they take a palette from `useTheme()`. */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  /**
   * Outline for controls whose fill is nearly the page colour (secondary buttons, chips).
   * >= 3:1 against `bg` and `surface` in both schemes, which is what a boundary needs to be
   * identifiable; `border` stays decorative for card edges and dividers.
   */
  borderStrong: string;
  /** Fill colour: buttons, FAB, selected chips, chart bars, the hero card. */
  primary: string;
  /**
   * The same hue tuned for text and icons on `bg`/`surface` — links, tab selection, arrows.
   * Dark mode fills stay dark (white labels) while the accent has to go light to clear 4.5:1,
   * so the two cannot share one value.
   */
  primaryText: string;
  /** 12-14% tint of `primary` — icon tiles and section chips. */
  primarySoft: string;
  text: string;
  muted: string;
  income: string;
  /** Solid tint behind an income icon chip: less muddy than an alpha over the page colour. */
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  transfer: string;
  /**
   * Hero balance card. Always a deep green with white type, in both schemes — the mockup does
   * not invert it, and a light hero would wash out the ring on top of it.
   */
  hero: string;
  /** Text on `primary` fills. Dark mode fills are dark greens, so this stays white. */
  onPrimary: string;
  onPrimaryMuted: string;
  /** Text on `expense` fills (danger button, error toast) — flips per scheme. */
  onExpense: string;
  /** Inverted pair for the toast, so a confirmation reads in both schemes. */
  overlayBg: string;
  overlayText: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: '#F3F3F1',
    surface: '#FFFFFF',
    surfaceMuted: '#EDF0EC',
    border: '#E7E7E1',
    borderStrong: '#7F8A81',
    primary: '#2F4A3D',
    primaryText: '#2F4A3D',
    primarySoft: '#EDF0EC',
    hero: '#2F4A3D',
    text: '#1B1F1C',
    muted: '#636D67',
    income: '#2F7D57',
    incomeSoft: '#E8F2EC',
    expense: '#B3473A',
    expenseSoft: '#F8EAE7',
    transfer: '#3B6E8F',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: 'rgba(255,255,255,0.82)',
    onExpense: '#FFFFFF',
    overlayBg: '#1E2A22',
    overlayText: '#FFFFFF',
  },
  dark: {
    bg: '#101311',
    surface: '#1A1E1B',
    surfaceMuted: '#202521',
    border: '#2B312C',
    borderStrong: '#6B7A71',
    primary: '#3F6D57',
    primaryText: '#9AC7AE',
    primarySoft: '#242A25',
    hero: '#26382F',
    text: '#EEF1ED',
    muted: '#9AA49B',
    income: '#6AC295',
    incomeSoft: '#1C2A22',
    expense: '#E08A7C',
    expenseSoft: '#2C211E',
    transfer: '#6FA8CF',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: 'rgba(255,255,255,0.82)',
    onExpense: '#2A1512',
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
  sm: 10,
  md: 16,
  /** Cards in the reference mockup sit between the row radius and the hero radius. */
  card: 18,
  lg: 20,
  pill: 999,
} as const;

/**
 * One elevation shared by every card, so the surface stack reads the same on every screen
 * (the mockup separates cards from the page with shadow, not with a darker border).
 */
export const cardShadow = {
  shadowColor: '#101814',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/** The hero card sits well above the page; everything else uses `cardShadow`. */
export const heroShadow = {
  shadowColor: '#14281E',
  shadowOpacity: 0.4,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as const;

/**
 * Ring / pill colours for "รายจ่ายวันนี้แยกตามหมวด". Deliberately not the semantic palette:
 * neighbouring segments must be told apart by hue, not by meaning, and the label next to each
 * dot carries the accessible name.
 */
export const CATEGORY_COLORS = [
  '#D9B56A',
  '#7FA7CF',
  '#CD8A72',
  '#9DC4A8',
  '#B39DDB',
  '#93A08A',
] as const;

/** `color` at `alpha` over any surface — the fallback tint when no solid soft colour exists. */
export function tint(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Pick the readable text colour for a solid chip (account badge, category pill).
 * Compares white against near-black on the actual colour, so a light accent never carries
 * white text below 4.5:1 — the account palette has one gold that needs the dark label.
 */
export function readableTextOn(hex: string): string {
  const value = hex.replace('#', '');
  const channel = (index: number) => {
    const c = parseInt(value.slice(index, index + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  const white = 1.05 / (luminance + 0.05);
  const dark = (luminance + 0.05) / 0.0621; // #12211A
  return white >= dark ? '#FFFFFF' : '#12211A';
}

/** Colours an account card may use. Mid-tone so they read on both backgrounds. */
export const ACCOUNT_COLORS = ['#2E7D32', '#2B6CB0', '#C33C3C', '#B7791F', '#6B46C1', '#0F766E'] as const;
