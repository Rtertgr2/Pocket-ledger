/** All money in this app is integer satang (1 baht = 100). */

const MAX_SATANG = 1e15; // 10 trillion baht — guards against typos, far above any real balance

/**
 * Parses what the user typed into satang: "1,234.56" -> 123456, "12" -> 1200, "0.005" -> 1.
 * Returns null when the text is not a positive money amount (signs, letters, >2 decimals are fine: rounded).
 */
export function parseAmountToSatang(input: string): number | null {
  const cleaned = input.replace(/[\s_]/g, '');
  if (!cleaned) return null;
  // ',' is a decimal mark only when there is no '.'; otherwise it is a thousands separator.
  const normalized = cleaned.includes('.') ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  const match = /^(\d*)(?:\.(\d*))?$/.exec(normalized);
  if (!match) return null;
  const [, intPart, fracPart = ''] = match;
  if (!intPart && !fracPart) return null;
  const frac = fracPart.padEnd(3, '0').slice(0, 3); // third digit decides rounding, half up
  const satang = Number(intPart || '0') * 100 + Number(frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? 1 : 0);
  return satang > MAX_SATANG ? null : satang;
}

/** "1234.50" — display only, no thousands separators yet. */
export function formatSatang(satang: number): string {
  const abs = Math.abs(Math.trunc(satang));
  const sign = satang < 0 ? '-' : '';
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
