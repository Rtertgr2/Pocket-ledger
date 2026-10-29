import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema for the local ledger. Money columns are INTEGER satang (1 baht = 100), not REAL.
 * Accounts are soft-deleted (is_active = 0), so no account delete may cascade away history.
 */
export const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    initial_balance_satang INTEGER NOT NULL DEFAULT 0,
    color_hex TEXT NOT NULL DEFAULT '#2E7D32',
    icon_name TEXT NOT NULL DEFAULT 'wallet',
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    destination_account_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    amount_satang INTEGER NOT NULL CHECK (amount_satang > 0),
    note TEXT,
    is_excluded_from_average INTEGER NOT NULL DEFAULT 0 CHECK (is_excluded_from_average IN (0, 1)),
    transaction_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    CHECK (type <> 'TRANSFER' OR (
      destination_account_id IS NOT NULL AND destination_account_id <> account_id
    ))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_calc
     ON transactions(type, is_excluded_from_average, transaction_date)`,

  // A balance is never stored: it is the account's starting point plus every transaction touching it.
  `CREATE VIEW IF NOT EXISTS v_account_balances AS
   SELECT a.*,
          a.initial_balance_satang
          + COALESCE((SELECT SUM(CASE t.type WHEN 'INCOME' THEN t.amount_satang
                                              ELSE -t.amount_satang END)
                      FROM transactions t
                      WHERE t.account_id = a.id AND t.type IN ('INCOME', 'EXPENSE')), 0)
          + COALESCE((SELECT SUM(CASE WHEN t.account_id = a.id THEN -t.amount_satang
                                      ELSE t.amount_satang END)
                      FROM transactions t
                      WHERE t.type = 'TRANSFER'
                        AND (t.account_id = a.id OR t.destination_account_id = a.id)), 0)
          AS balance_satang
   FROM accounts a`,
];

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.execAsync(DDL.map((statement) => `${statement};`).join('\n'));
  await db.execAsync('PRAGMA user_version = 1');
}
