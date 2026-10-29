import type { SQLiteDatabase } from 'expo-sqlite';
import type { AccountBalance } from '../../types';

export function listAccounts(db: SQLiteDatabase): Promise<AccountBalance[]> {
  return db.getAllAsync<AccountBalance>(
    'SELECT * FROM v_account_balances ORDER BY is_active DESC, name'
  );
}

export async function getAccountBalance(db: SQLiteDatabase, id: string): Promise<number> {
  const row = await db.getFirstAsync<{ balance_satang: number }>(
    'SELECT balance_satang FROM v_account_balances WHERE id = ?',
    id
  );
  if (!row) throw new Error(`account ${id} not found`);
  return row.balance_satang;
}

export async function insertAccount(
  db: SQLiteDatabase,
  input: { id: string; name: string; initial_balance_satang: number; color_hex?: string }
): Promise<void> {
  await db.runAsync(
    'INSERT INTO accounts (id, name, initial_balance_satang, color_hex) VALUES (?, ?, ?, ?)',
    input.id,
    input.name,
    input.initial_balance_satang,
    input.color_hex ?? '#2E7D32'
  );
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  color_hex?: string;
  is_active?: number;
}

/** Accounts are never deleted; `is_active = 0` retires one and keeps its history. */
export async function updateAccount(db: SQLiteDatabase, input: UpdateAccountInput): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.color_hex !== undefined) {
    fields.push('color_hex = ?');
    values.push(input.color_hex);
  }
  if (input.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(input.is_active);
  }
  if (fields.length === 0) return;

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(input.id);
  await db.runAsync(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, ...values);
}
