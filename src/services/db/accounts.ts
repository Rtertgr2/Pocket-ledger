import type { SQLiteDatabase } from 'expo-sqlite';
import type { AccountBalance } from '../../types';

export function listAccounts(db: SQLiteDatabase): Promise<AccountBalance[]> {
  return db.getAllAsync<AccountBalance>(
    'SELECT * FROM v_account_balances ORDER BY is_active DESC, name'
  );
}

export async function insertAccount(
  db: SQLiteDatabase,
  input: { id: string; name: string; initial_balance_satang: number }
): Promise<void> {
  await db.runAsync(
    'INSERT INTO accounts (id, name, initial_balance_satang) VALUES (?, ?, ?)',
    input.id,
    input.name,
    input.initial_balance_satang
  );
}
