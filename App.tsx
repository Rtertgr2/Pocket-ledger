import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { initDatabase } from './src/services/db/schema';
import { useAppStore } from './src/store/useAppStore';
import { formatSatang } from './src/utils/money';

/** Phase 2 dev harness: every money rule must hold with no UI on top. */
function PhaseTwoHarness() {
  const db = useSQLiteContext();
  const accounts = useAppStore((s) => s.accounts);
  const totalSatang = useAppStore((s) => s.totalSatang);
  const burnRateSatang = useAppStore((s) => s.burnRateSatang);
  const recent = useAppStore((s) => s.recent);
  const fetchAccounts = useAppStore((s) => s.fetchAccounts);
  const fetchStats = useAppStore((s) => s.fetchStats);
  const createAccount = useAppStore((s) => s.createAccount);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const transferFunds = useAppStore((s) => s.transferFunds);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const reconcileBalance = useAppStore((s) => s.reconcileBalance);

  useEffect(() => {
    fetchAccounts(db);
    fetchStats(db);
  }, [db, fetchAccounts, fetchStats]);

  const cash = accounts.find((a) => a.name === 'เงินสด');
  const bank = accounts.find((a) => a.name === 'KBank');

  async function ensureAccounts() {
    if (!cash) await createAccount(db, { name: 'เงินสด', initial_balance_satang: 50000 });
    if (!bank) await createAccount(db, { name: 'KBank', initial_balance_satang: 200000 });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Total {formatSatang(totalSatang)}</Text>
      <Text style={styles.label}>Burn rate {formatSatang(burnRateSatang)} / day</Text>

      {accounts.map((account) => (
        <Text key={account.id} style={styles.row}>
          {account.name}: {formatSatang(account.balance_satang)}
        </Text>
      ))}

      <Pressable
        style={styles.button}
        onPress={async () => {
          await ensureAccounts();
          await addTransaction(db, {
            account_id: cash?.id ?? (await useAppStore.getState().accounts)[0]?.id,
            type: 'EXPENSE',
            amount_satang: 2000,
            note: 'demo',
          });
        }}
      >
        <Text style={styles.buttonText}>Expense 20.00 (affects burn rate)</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={async () => {
          await ensureAccounts();
          const [from, to] = useAppStore.getState().accounts;
          if (!from || !to) return;
          await transferFunds(db, {
            account_id: from.id,
            destination_account_id: to.id,
            amount_satang: 10000,
          });
        }}
      >
        <Text style={styles.buttonText}>Transfer 100.00 between accounts</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={async () => {
          await ensureAccounts();
          const first = useAppStore.getState().accounts[0];
          if (!first) return;
          await reconcileBalance(db, { account_id: first.id, actual_balance_satang: 500 });
        }}
      >
        <Text style={styles.buttonText}>Reconcile first account to 5.00</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={async () => {
          const first = useAppStore.getState().accounts[0];
          if (!first) return;
          await reconcileBalance(db, {
            account_id: first.id,
            actual_balance_satang: first.balance_satang,
          });
        }}
      >
        <Text style={styles.buttonText}>Reconcile to current (no-op)</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => {
          const newest = useAppStore.getState().recent[0];
          if (newest) deleteTransaction(db, newest.id);
        }}
      >
        <Text style={styles.buttonText}>Delete newest transaction</Text>
      </Pressable>

      <Text style={styles.label}>Recent</Text>
      {recent.map((tx) => (
        <Text key={tx.id} style={styles.row}>
          {tx.type} {formatSatang(tx.amount_satang)}
          {tx.is_excluded_from_average ? ' (excluded)' : ''} {tx.note ?? ''}
        </Text>
      ))}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

export default function App() {
  return (
    <SQLiteProvider databaseName="pocket-ledger.db" onInit={initDatabase}>
      <PhaseTwoHarness />
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 24, paddingTop: 64 },
  label: { fontSize: 16, fontWeight: '600' },
  row: { fontSize: 13, color: '#333' },
  button: { backgroundColor: '#2E7D32', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
