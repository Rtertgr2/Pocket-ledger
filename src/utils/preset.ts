/**
 * Quick Vault: the entries a user records over and over ("กาแฟ 55"), and the account/category
 * they reach for most. Pure parsing lives here so `node --test` can cover it without the native
 * key-value store; `services/storage/settings.ts` does the reading and writing.
 */

export const MAX_PRESETS = 8;

export interface QuickPreset {
  id: string;
  /** What the chip says, e.g. "กาแฟ 55". */
  label: string;
  amount_satang: number;
  account_id: string;
  category: string | null;
  /** The categories differ per type, so a preset has to remember which side it belongs to. */
  type: 'EXPENSE' | 'INCOME';
}

export interface LastEntry {
  type: 'EXPENSE' | 'INCOME';
  account_id: string | null;
  category: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  // Arrays are objects too, but a list is never a valid preset or last-used entry.
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asEntryType(value: unknown): 'EXPENSE' | 'INCOME' | null {
  return value === 'EXPENSE' || value === 'INCOME' ? value : null;
}

/**
 * Drops anything that does not look like a preset instead of throwing: a value written by an
 * older build (or a half-finished write) must never stop the add screen from opening.
 */
export function parsePresets(raw: string): QuickPreset[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const presets: QuickPreset[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) continue;
    const id = asString(entry.id);
    const label = asString(entry.label);
    const accountId = asString(entry.account_id);
    const type = asEntryType(entry.type);
    const amount = entry.amount_satang;
    // Money is integer satang everywhere else, so a stored float or negative is not a preset.
    if (!id || !label || !accountId || !type) continue;
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) continue;
    presets.push({
      id,
      label,
      amount_satang: amount,
      account_id: accountId,
      category: asString(entry.category),
      type,
    });
    if (presets.length === MAX_PRESETS) break;
  }
  return presets;
}

export function serializePresets(presets: QuickPreset[]): string {
  return JSON.stringify(presets.slice(0, MAX_PRESETS));
}

export function parseLastEntry(raw: string): LastEntry | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const type = asEntryType(parsed.type) ?? 'EXPENSE';
  return { type, account_id: asString(parsed.account_id), category: asString(parsed.category) };
}
