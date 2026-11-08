import type { SQLiteDatabase } from 'expo-sqlite';
import type { BackupFile } from '../backup/format';
import type { Account, Transaction } from '../../types';

/** Accounts first: a backup restore never deletes, it only adds what is missing. */
export function listAllAccounts(db: SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY created_at ASC');
}

export function listAllTransactions(db: SQLiteDatabase): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    'SELECT * FROM transactions ORDER BY transaction_date ASC, created_at ASC'
  );
}

/**
 * Idempotent merge: `INSERT OR IGNORE` keyed on the row id, so importing the same file twice is
 * a no-op the second time and a restore into a half-full device only adds what is missing.
 * One transaction, so a foreign-key failure leaves no partial restore behind.
 */
export async function insertBackup(
  db: SQLiteDatabase,
  backup: BackupFile
): Promise<{ accounts: number; transactions: number }> {
  let accounts = 0;
  let transactions = 0;

  await db.withTransactionAsync(async () => {
    for (const account of backup.accounts) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO accounts
           (id, name, initial_balance_satang, color_hex, icon_name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        account.id,
        account.name,
        account.initial_balance_satang,
        account.color_hex,
        account.icon_name,
        account.is_active,
        account.created_at,
        account.updated_at
      );
      accounts += result.changes;
    }

    for (const transaction of backup.transactions) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO transactions
           (id, account_id, destination_account_id, type, amount_satang, note, category,
            is_excluded_from_average, transaction_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        transaction.id,
        transaction.account_id,
        transaction.destination_account_id,
        transaction.type,
        transaction.amount_satang,
        transaction.note,
        transaction.category,
        transaction.is_excluded_from_average,
        transaction.transaction_date,
        transaction.created_at,
        // A restore must keep the edit date; a v1 file arrives here already normalised.
        transaction.updated_at ?? transaction.created_at
      );
      transactions += result.changes;
    }
  });

  return { accounts, transactions };
}
