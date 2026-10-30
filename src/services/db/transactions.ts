import type { SQLiteDatabase } from 'expo-sqlite';
import type { ReportExpense, Transaction, TransactionType } from '../../types';

export interface InsertTransactionInput {
  id: string;
  account_id: string;
  destination_account_id?: string | null;
  type: TransactionType;
  amount_satang: number;
  note?: string | null;
  category?: string | null;
  is_excluded_from_average?: number;
  transaction_date: string;
}

export async function insertTransaction(
  db: SQLiteDatabase,
  input: InsertTransactionInput
): Promise<void> {
  await db.runAsync(
    `INSERT INTO transactions
       (id, account_id, destination_account_id, type, amount_satang, note, category,
        is_excluded_from_average, transaction_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.id,
    input.account_id,
    input.destination_account_id ?? null,
    input.type,
    input.amount_satang,
    input.note ?? null,
    input.category ?? null,
    input.is_excluded_from_average ?? 0,
    input.transaction_date
  );
}

/** Returns the number of rows removed; 0 means the id did not exist. */
export async function deleteTransactionById(db: SQLiteDatabase, id: string): Promise<number> {
  const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  return result.changes;
}

/** Total rows, not just the loaded pages — the settings screen reports the real size. */
export async function countTransactions(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM transactions');
  return row?.total ?? 0;
}

/** Newest first. `created_at` breaks ties so two same-second rows keep a stable order. */
export function listTransactions(db: SQLiteDatabase, limit = 200, offset = 0): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    'SELECT * FROM transactions ORDER BY transaction_date DESC, created_at DESC LIMIT ? OFFSET ?',
    limit,
    offset
  );
}

/** Burn-rate numerator: eligible EXPENSE rows inside [startIso, endIso). */
export async function sumExpensesInRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string
): Promise<number> {
  const row = await db.getFirstAsync<{ satang: number }>(
    `SELECT COALESCE(SUM(amount_satang), 0) AS satang
       FROM transactions
      WHERE type = 'EXPENSE'
        AND is_excluded_from_average = 0
        AND transaction_date >= ?
        AND transaction_date < ?`,
    startIso,
    endIso
  );
  return row?.satang ?? 0;
}

/**
 * The first stat on the report screen: income in [startIso, endIso), with balance adjustments
 * left out so a reconcile never shows up as salary.
 */
export async function sumIncomeInRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string
): Promise<number> {
  const row = await db.getFirstAsync<{ satang: number }>(
    `SELECT COALESCE(SUM(amount_satang), 0) AS satang
       FROM transactions
      WHERE type = 'INCOME'
        AND is_excluded_from_average = 0
        AND transaction_date >= ?
        AND transaction_date < ?`,
    startIso,
    endIso
  );
  return row?.satang ?? 0;
}

/**
 * The rows a report needs: eligible (not excluded) expenses in [startIso, endIso).
 * Deliberately mirrors `sumExpensesInRange` so a chart can never disagree with the burn rate.
 */
export function listExpensesInRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string
): Promise<ReportExpense[]> {
  return db.getAllAsync<ReportExpense>(
    `SELECT amount_satang, category, transaction_date
       FROM transactions
      WHERE type = 'EXPENSE'
        AND is_excluded_from_average = 0
        AND transaction_date >= ?
        AND transaction_date < ?
      ORDER BY transaction_date ASC`,
    startIso,
    endIso
  );
}
