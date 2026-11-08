import type { SQLiteDatabase } from 'expo-sqlite';

/** Bump when the DDL changes. Every bump needs an entry in `MIGRATIONS`. */
export const SCHEMA_VERSION = 3;

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
    category TEXT,
    is_excluded_from_average INTEGER NOT NULL DEFAULT 0 CHECK (is_excluded_from_average IN (0, 1)),
    transaction_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT,
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
  // Views hold no data, so recreating on every launch keeps a stale definition from surviving a schema edit.
  `DROP VIEW IF EXISTS v_account_balances`,
  `CREATE VIEW v_account_balances AS
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

/**
 * Statements that upgrade an existing database to a newer version, keyed by target version.
 * A fresh install runs `DDL` only, because `DDL` already describes the newest shape.
 */
export const MIGRATIONS: Record<number, string[]> = {
  2: ['ALTER TABLE transactions ADD COLUMN category TEXT'],
  // v3: when the row was last edited. `ALTER TABLE` refuses a non-constant DEFAULT, so the column
  // is nullable and filled here for existing rows; the app writes CURRENT_TIMESTAMP from now on.
  3: [
    'ALTER TABLE transactions ADD COLUMN updated_at TEXT',
    'UPDATE transactions SET updated_at = created_at WHERE updated_at IS NULL',
  ],
};

/**
 * Run after `MIGRATIONS`, on both a fresh install and an upgraded one. These statements reference
 * columns a migration may only just have added (`category` arrived in v2), so they cannot live in
 * `DDL` — `DDL` runs first, and creating an index on a v1 database would fail before the upgrade.
 */
export const POST_MIGRATION_DDL: string[] = [
  // Serves the category filter on the ledger screen.
  'CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)',
];

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;

  await db.execAsync(DDL.map((statement) => `${statement};`).join('\n'));

  // user_version 0 means there was no database before this launch: the DDL is already current.
  if (from > 0) {
    for (let version = from + 1; version <= SCHEMA_VERSION; version += 1) {
      for (const statement of MIGRATIONS[version] ?? []) {
        await db.execAsync(`${statement};`);
      }
    }
  }

  // Indexes that need a migrated column run last, so they work on every starting version.
  for (const statement of POST_MIGRATION_DDL) {
    await db.execAsync(`${statement};`);
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
