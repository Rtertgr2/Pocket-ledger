// Explicit .ts extensions: this module is imported by `node --test`, which resolves strictly.
import type { Account, Transaction, TransactionType } from '../../types';

/**
 * The on-disk backup envelope. A file is only accepted when `format` and `version` match, so a
 * stray JSON file (or a future format) is rejected instead of half-imported.
 */
export const BACKUP_FORMAT = 'pocket-ledger.backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  accounts: Account[];
  transactions: Transaction[];
}

const TRANSACTION_TYPES: TransactionType[] = ['INCOME', 'EXPENSE', 'TRANSFER'];

/** Wraps a snapshot in the versioned envelope, newest timestamp first. */
export function buildBackup(
  accounts: Account[],
  transactions: Transaction[],
  now: Date = new Date()
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    accounts,
    transactions,
  };
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

/**
 * Validates and normalises a backup file. Everything that reaches SQLite has been through here,
 * so an import can only fail on cross-row problems (missing account), never on a shape surprise.
 * Errors are user-facing Thai sentences — they are shown in a toast.
 */
export function parseBackup(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้' };
  }

  if (!isRecord(parsed)) return { ok: false, error: 'ไฟล์สำรองไม่ครบถ้วน' };
  if (parsed.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Pocket Ledger' };
  }
  if (parsed.version !== BACKUP_VERSION) {
    return { ok: false, error: `ไฟล์สำรองเวอร์ชัน ${String(parsed.version)} ยังไม่รองรับ` };
  }
  if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.transactions)) {
    return { ok: false, error: 'ไฟล์สำรองไม่ครบถ้วน' };
  }

  const accounts: Account[] = [];
  const seenAccounts = new Set<string>();
  for (const [index, row] of parsed.accounts.entries()) {
    const account = normalizeAccount(row);
    if (!account) return { ok: false, error: `บัญชีลำดับที่ ${index + 1} ในไฟล์ไม่ถูกต้อง` };
    if (seenAccounts.has(account.id)) {
      return { ok: false, error: `ไฟล์สำรองมีบัญชีรหัสซ้ำ (${account.id})` };
    }
    seenAccounts.add(account.id);
    accounts.push(account);
  }

  const transactions: Transaction[] = [];
  const seenTransactions = new Set<string>();
  for (const [index, row] of parsed.transactions.entries()) {
    const transaction = normalizeTransaction(row);
    if (!transaction) return { ok: false, error: `รายการลำดับที่ ${index + 1} ในไฟล์ไม่ถูกต้อง` };
    if (seenTransactions.has(transaction.id)) {
      return { ok: false, error: `ไฟล์สำรองมีรายการรหัสซ้ำ (${transaction.id})` };
    }
    seenTransactions.add(transaction.id);
    transactions.push(transaction);
  }

  const exportedAt =
    typeof parsed.exportedAt === 'string' && !Number.isNaN(Date.parse(parsed.exportedAt))
      ? parsed.exportedAt
      : new Date().toISOString();

  return {
    ok: true,
    backup: { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, accounts, transactions },
  };
}

/**
 * Account rows referenced by a transaction must exist either in the file or already on the
 * device. Checked before writing so a bad file cannot leave half a restore behind.
 */
export function missingAccountIds(backup: BackupFile, existingAccountIds: Iterable<string>): string[] {
  const known = new Set(existingAccountIds);
  for (const account of backup.accounts) known.add(account.id);

  const missing = new Set<string>();
  for (const transaction of backup.transactions) {
    if (!known.has(transaction.account_id)) missing.add(transaction.account_id);
    const destination = transaction.destination_account_id;
    if (destination && !known.has(destination)) missing.add(destination);
  }
  return [...missing];
}

function normalizeAccount(row: unknown): Account | null {
  if (!isRecord(row)) return null;
  const id = text(row.id);
  const name = text(row.name);
  if (!id || !name) return null;

  const initial = row.initial_balance_satang;
  if (typeof initial !== 'number' || !Number.isInteger(initial)) return null;

  const createdAt = text(row.created_at) ?? new Date().toISOString();
  const updatedAt = text(row.updated_at) ?? createdAt;

  return {
    id,
    name,
    initial_balance_satang: initial,
    color_hex: text(row.color_hex) ?? '#2E7D32',
    icon_name: text(row.icon_name) ?? 'wallet',
    // Accounts default to active: an old file without the column must not hide every account.
    is_active: row.is_active === 0 ? 0 : 1,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function normalizeTransaction(row: unknown): Transaction | null {
  if (!isRecord(row)) return null;

  const id = text(row.id);
  const accountId = text(row.account_id);
  const type = text(row.type);
  const date = text(row.transaction_date);
  const amount = row.amount_satang;

  if (!id || !accountId || !date) return null;
  if (!TRANSACTION_TYPES.includes(type as TransactionType)) return null;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) return null;
  if (Number.isNaN(Date.parse(date))) return null;

  const destination = text(row.destination_account_id) ?? null;
  if (type === 'TRANSFER' && (!destination || destination === accountId)) return null;

  return {
    id,
    account_id: accountId,
    destination_account_id: destination,
    type: type as TransactionType,
    amount_satang: amount,
    note: text(row.note) ?? null,
    category: text(row.category) ?? null,
    is_excluded_from_average: flag(row.is_excluded_from_average),
    transaction_date: date,
    created_at: text(row.created_at) ?? new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** SQLite stores booleans as 0/1; anything else falls back to "not set". */
function flag(value: unknown): number {
  return value === 1 ? 1 : 0;
}
