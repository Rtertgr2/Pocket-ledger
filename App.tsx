import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { initDatabase } from './src/services/db/schema';
import { formatSatang } from './src/utils/money';

async function summarize(db: SQLiteDatabase): Promise<string> {
  const accounts = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM accounts');
  const txs = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions');
  const total = await db.getFirstAsync<{ satang: number }>(
    'SELECT COALESCE(SUM(balance_satang), 0) AS satang FROM v_account_balances WHERE is_active = 1'
  );
  return `${accounts?.n ?? 0} accounts, ${txs?.n ?? 0} transactions, total ${formatSatang(total?.satang ?? 0)}`;
}

/** Inserts one 20.00 expense. Balances are derived, so there is no account update to keep in sync. */
async function addDemoExpense(db: SQLiteDatabase): Promise<void> {
  const id = String(Date.now());
  await db.runAsync(
    `INSERT OR IGNORE INTO accounts (id, name, initial_balance_satang) VALUES ('cash', 'เงินสด', 50000)`
  );
  await db.runAsync(
    `INSERT INTO transactions (id, account_id, type, amount_satang, note, transaction_date)
     VALUES (?, 'cash', 'EXPENSE', 2000, 'demo', ?)`,
    id,
    new Date().toISOString()
  );
}

/** Phase 1 proof of life: DB opens, schema applies, writes survive an app reload. */
function PhaseOneCheck() {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState('...');

  useEffect(() => {
    let alive = true;
    summarize(db).then((text) => {
      if (alive) setSummary(text);
    });
    return () => {
      alive = false;
    };
  }, [db]);

  async function onAdd() {
    await addDemoExpense(db);
    setSummary(await summarize(db));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pocket Ledger — Phase 1</Text>
      <Text style={styles.summary}>{summary}</Text>
      <Pressable style={styles.button} onPress={onAdd}>
        <Text style={styles.buttonText}>Add 20.00 demo expense</Text>
      </Pressable>
      <Text style={styles.hint}>Close and reopen the app — the numbers must remain.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <SQLiteProvider databaseName="pocket-ledger.db" onInit={initDatabase}>
      <PhaseOneCheck />
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  label: { fontSize: 14, color: '#666' },
  summary: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  button: { backgroundColor: '#2E7D32', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#999', textAlign: 'center' },
});
