/** Design tokens. Screens never invent hex codes — they take a palette from `useTheme()`. */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  surfaceMuted: string;
  /** Raised neutral behind segmented tracks, chips and the ring's empty track. */
  tile: string;
  border: string;
  /**
   * Outline for controls whose fill is nearly the page colour (secondary buttons, chips).
   * >= 3:1 against `bg` and `surface` in both schemes, which is what a boundary needs to be
   * identifiable; `border` stays decorative for card edges and dividers.
   */
  borderStrong: string;
  /** Fill colour: buttons, selected chips, chart bars. */
  primary: string;
  /**
   * The same hue tuned for text and icons on `bg`/`surface` — links, tab selection, arrows.
   * Dark mode fills stay light (dark labels) while the accent has to stay light too, so the two
   * cannot share one value with `onPrimary`.
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
  /** A hue reserved for non-semantic highlights (transfers, links inside charts). */
  accent: string;
  /** Legacy hero surface; kept so older screens keep a valid token. */
  hero: string;
  /** The raised centre button of the tab bar. */
  navAdd: string;
  onNavAdd: string;
  /** Text on `primary` fills. Dark mode fills are light greens, so this goes dark. */
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
    bg: '#F2F3F0',
    surface: '#FFFFFF',
    surfaceMuted: '#F7F8F5',
    tile: '#EDF0EC',
    border: '#E5E7E0',
    borderStrong: '#7F8A81',
    primary: '#2F6B4F',
    primaryText: '#2C6549',
    primarySoft: '#EDF0EC',
    hero: '#2F4A3D',
    text: '#1B1F1C',
    muted: '#636D67',
    income: '#2F7D57',
    incomeSoft: '#E7F3EC',
    expense: '#C0483D',
    expenseSoft: '#FAEAE7',
    transfer: '#3B6E8F',
    accent: '#3F74E0',
    navAdd: '#2F6B4F',
    onNavAdd: '#FFFFFF',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: 'rgba(255,255,255,0.82)',
    onExpense: '#FFFFFF',
    overlayBg: '#1B1F1C',
    overlayText: '#FFFFFF',
  },
  dark: {
    bg: '#0D0F0E',
    surface: '#171A18',
    surfaceMuted: '#1E2220',
    tile: '#212623',
    border: '#272C28',
    borderStrong: '#6B7A71',
    primary: '#4CC08A',
    primaryText: '#4CC08A',
    primarySoft: '#212623',
    hero: '#26382F',
    text: '#EEF2EE',
    muted: '#8E978F',
    income: '#4FD18F',
    incomeSoft: '#16301F',
    expense: '#FF7A7A',
    expenseSoft: '#2F1A1A',
    transfer: '#6FA8CF',
    accent: '#5B8DEF',
    navAdd: '#35785A',
    onNavAdd: '#FFFFFF',
    onPrimary: '#0B1410',
    onPrimaryMuted: 'rgba(11,20,16,0.82)',
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
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
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
 * Ring / pill colours for "รายจ่ายตามหมวด". Deliberately not the semantic palette:
 * neighbouring segments must be told apart by hue, not by meaning, and the label next to each
 * dot carries the accessible name.
 */
export const CATEGORY_COLORS = [
  '#5B8DEF',
  '#4CC08A',
  '#E2A24A',
  '#E57A6A',
  '#A98FE0',
  '#6FC2B8',
  '#C98FB0',
  '#93A08A',
] as const;

/** Category tint by index, stable across ring and lists so the same category keeps its hue. */
export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

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
