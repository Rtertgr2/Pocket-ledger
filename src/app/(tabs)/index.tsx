import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Entrance } from '../../components/common/Entrance';
import { Screen } from '../../components/common/Screen';
import { useToast } from '../../components/common/Toast';
import { AccountCard } from '../../components/dashboard/AccountCard';
import { BurnRateCard } from '../../components/dashboard/BurnRateCard';
import { TodayPills } from '../../components/dashboard/TodayPills';
import { TotalBalanceCard } from '../../components/dashboard/TotalBalanceCard';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { useDeleteTransaction } from '../../hooks/useDeleteTransaction';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { spacing } from '../../theme';
import type { Transaction } from '../../types';
import { todayExpenseTotals } from '../../utils/reports';

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

  // Same eligibility as the reports, so the ring never disagrees with the burn rate.
  const todayTotals = useMemo(() => todayExpenseTotals(transactions), [transactions]);

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
            tintColor={palette.primaryText}
            colors={[palette.primaryText]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Pocket Ledger</Text>
          <Text style={styles.subtitle}>บันทึกรายรับ–รายจ่ายในเครื่องคุณ</Text>
        </View>

        <Entrance>
          <TotalBalanceCard
            totalSatang={totalSatang}
            accountCount={activeAccounts.length}
            todayTotals={todayTotals}
          />
        </Entrance>
        <Entrance delayMs={60}>
          <TodayPills totals={todayTotals} />
        </Entrance>
        <Entrance delayMs={120}>
          <BurnRateCard burnRateSatang={burnRateSatang} monthExpenseSatang={monthExpenseSatang} />
        </Entrance>

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
            <View style={styles.chips}>
              {activeAccounts.map((account) => (
                <Entrance key={account.id} delayMs={140}>
                  <AccountCard
                    account={account}
                    onPress={() => openAdd(account.id)}
                    onLongPress={() =>
                      router.push({ pathname: '/reconcile', params: { accountId: account.id } })
                    }
                  />
                </Entrance>
              ))}
            </View>
            <View style={styles.actions}>
              <Button label="โอนเงิน" variant="secondary" onPress={() => router.push('/transfer')} style={styles.action} />
              <Button label="ปรับยอด" variant="secondary" onPress={() => router.push('/reconcile')} style={styles.action} />
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>รายการล่าสุด</Text>
          {transactions.length > RECENT_LIMIT ? (
            <Text
              style={styles.link}
              accessibilityRole="link"
              onPress={() => router.push('/transactions')}
            >
              ดูทั้งหมด
            </Text>
          ) : null}
        </View>
        {recent.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyBody}>ยังไม่มีรายการ — แตะที่บัญชีเพื่อเริ่มบันทึก</Text>
          </Card>
        ) : (
          <View style={styles.recentList}>
            {recent.map((transaction: Transaction, index) => (
              <Entrance key={transaction.id} delayMs={180 + Math.min(index, 4) * 50}>
                <TransactionItem
                  transaction={transaction}
                  accountLabel={nameOf(transaction.account_id)}
                  destinationLabel={
                    transaction.destination_account_id ? nameOf(transaction.destination_account_id) : undefined
                  }
                  onLongPress={() => confirmDelete(transaction)}
                />
              </Entrance>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { paddingTop: spacing.md, paddingBottom: spacing.xs, gap: 2 },
  title: { fontSize: 25, fontWeight: '700' as const, letterSpacing: -0.3, color: palette.text },
  subtitle: { fontSize: 13, color: palette.muted },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, letterSpacing: -0.1, color: palette.text },
  sectionHint: { fontSize: 11, color: palette.muted, textAlign: 'right' as const },
  link: { fontSize: 13, fontWeight: '600' as const, color: palette.primaryText },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  actions: { flexDirection: 'row' as const, gap: spacing.md },
  action: { flex: 1 },
  empty: { gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700' as const, color: palette.text },
  emptyBody: { fontSize: 13, color: palette.muted },
  recentList: { gap: spacing.sm },
}));
