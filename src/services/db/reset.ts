import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Deletes every transaction and then every account.
 *
 * Order matters: `transactions.account_id` is ON DELETE RESTRICT, so accounts cannot go first.
 * Settings (theme, backup config) are not ledger data and deliberately survive — "ล้างข้อมูล"
 * means the records the user entered, not their app preferences.
 */
export async function clearLedger(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions');
    await db.runAsync('DELETE FROM accounts');
  });
}
