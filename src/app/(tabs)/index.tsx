import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Screen } from '../../components/common/Screen';
import { useToast } from '../../components/common/Toast';
import { AccountCard } from '../../components/dashboard/AccountCard';
import { BurnRateCard } from '../../components/dashboard/BurnRateCard';
import { TotalBalanceCard } from '../../components/dashboard/TotalBalanceCard';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { useDeleteTransaction } from '../../hooks/useDeleteTransaction';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { spacing } from '../../theme';
import type { Transaction } from '../../types';

const RECENT_LIMIT = 5;

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();
  const [refreshing, setRefreshing] = useState(false);

  const accounts = useAppStore((s) => s.accounts);
  const totalSatang = useAppStore((s) => s.totalSatang);
  const burnRateSatang = useAppStore((s) => s.burnRateSatang);
  const monthExpenseSatang = useAppStore((s) => s.monthExpenseSatang);
  const transactions = useAppStore((s) => s.transactions);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const confirmDelete = useDeleteTransaction(db);

  const reload = useCallback(async () => {
    try {
      await refreshAll(db);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
  }, [db, refreshAll, showToast]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const activeAccounts = accounts.filter((account) => account.is_active === 1);
  const recent = transactions.slice(0, RECENT_LIMIT);
  const nameOf = (id: string) => accounts.find((account) => account.id === id)?.name ?? 'ไม่พบบัญชี';
  const openAdd = (accountId?: string) => router.push({ pathname: '/add', params: { accountId } });

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Pocket Ledger</Text>
          <Text style={styles.subtitle}>บันทึกรายรับ–รายจ่ายในเครื่องคุณ</Text>
        </View>

        <TotalBalanceCard totalSatang={totalSatang} accountCount={activeAccounts.length} />
        <BurnRateCard burnRateSatang={burnRateSatang} monthExpenseSatang={monthExpenseSatang} />

        {activeAccounts.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>สร้างบัญชีแรกของคุณ</Text>
            <Text style={styles.emptyBody}>
              เริ่มจากกระเป๋าเงินสดหรือบัญชีธนาคาร แล้วบันทึกรายการได้ทันที
            </Text>
            <Button label="เพิ่มบัญชี" onPress={() => router.push('/account/new')} />
          </Card>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>บัญชีของฉัน</Text>
              <Text style={styles.sectionHint}>แตะเพื่อบันทึก · กดค้างเพื่อปรับยอด</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
              {activeAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onPress={() => openAdd(account.id)}
                  onLongPress={() =>
                    router.push({ pathname: '/reconcile', params: { accountId: account.id } })
                  }
                />
              ))}
            </ScrollView>
            <View style={styles.actions}>
              <Button label="โอนเงิน" variant="secondary" onPress={() => router.push('/transfer')} style={styles.action} />
              <Button label="ปรับยอด" variant="secondary" onPress={() => router.push('/reconcile')} style={styles.action} />
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>รายการล่าสุด</Text>
          {transactions.length > RECENT_LIMIT ? (
            <Text style={styles.link} onPress={() => router.push('/transactions')}>
              ดูทั้งหมด
            </Text>
          ) : null}
        </View>
        <Card style={styles.recent}>
          {recent.length === 0 ? (
            <Text style={styles.emptyBody}>ยังไม่มีรายการ — แตะที่บัญชีเพื่อเริ่มบันทึก</Text>
          ) : (
            recent.map((transaction: Transaction, index) => (
              <View key={transaction.id} style={index > 0 ? styles.divider : null}>
                <TransactionItem
                  transaction={transaction}
                  accountLabel={nameOf(transaction.account_id)}
                  destinationLabel={
                    transaction.destination_account_id ? nameOf(transaction.destination_account_id) : undefined
                  }
                  onLongPress={() => confirmDelete(transaction)}
                />
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { paddingTop: spacing.md, gap: 2 },
  greeting: { fontSize: 24, fontWeight: '800' as const, color: palette.text },
  subtitle: { fontSize: 13, color: palette.muted },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: palette.text },
  sectionHint: { fontSize: 11, color: palette.muted },
  link: { fontSize: 13, fontWeight: '600' as const, color: palette.primary },
  cards: { gap: spacing.md, paddingRight: spacing.lg },
  actions: { flexDirection: 'row' as const, gap: spacing.md },
  action: { flex: 1 },
  empty: { gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700' as const, color: palette.text },
  emptyBody: { fontSize: 13, color: palette.muted },
  recent: { paddingVertical: spacing.xs },
  divider: { borderTopWidth: 1, borderTopColor: palette.border },
}));
