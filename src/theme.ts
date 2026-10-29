/** Design tokens. One source for colours, spacing and radii — screens never invent hex codes. */
export const colors = {
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
  white: '#FFFFFF',
} as const;

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

export const type = {
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;

/** Accent per transaction type, so income/expense/transfer stay visually distinct. */
export const typeColor = {
  INCOME: colors.income,
  EXPENSE: colors.expense,
  TRANSFER: colors.transfer,
} as const;
