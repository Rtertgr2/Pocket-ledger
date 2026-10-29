import type { SQLiteDatabase } from 'expo-sqlite';
import type { Transaction, TransactionType } from '../../types';

export interface InsertTransactionInput {
  id: string;
  account_id: string;
  destination_account_id?: string | null;
  type: TransactionType;
  amount_satang: number;
  note?: string | null;
  is_excluded_from_average?: number;
  transaction_date: string;
}

export async function insertTransaction(
  db: SQLiteDatabase,
  input: InsertTransactionInput
): Promise<void> {
  await db.runAsync(
    `INSERT INTO transactions
       (id, account_id, destination_account_id, type, amount_satang, note,
        is_excluded_from_average, transaction_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.id,
    input.account_id,
    input.destination_account_id ?? null,
    input.type,
    input.amount_satang,
    input.note ?? null,
    input.is_excluded_from_average ?? 0,
    input.transaction_date
  );
}

/** Returns the number of rows removed; 0 means the id did not exist. */
export async function deleteTransactionById(db: SQLiteDatabase, id: string): Promise<number> {
  const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
  return result.changes;
}

export function listRecentTransactions(
  db: SQLiteDatabase,
  limit: number
): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    'SELECT * FROM transactions ORDER BY transaction_date DESC LIMIT ?',
    limit
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
