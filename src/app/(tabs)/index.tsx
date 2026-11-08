import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Entrance } from '../../components/common/Entrance';
import { PressableScale } from '../../components/common/PressableScale';
import { Screen } from '../../components/common/Screen';
import { SectionHead } from '../../components/common/SectionHead';
import { useToast } from '../../components/common/Toast';
import { AccountRow } from '../../components/overview/AccountRow';
import { CategoryRingCard } from '../../components/overview/CategoryRingCard';
import { SummaryCard } from '../../components/overview/SummaryCard';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { useTransactionMenu } from '../../hooks/useTransactionMenu';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { listExpensesInRange } from '../../services/db/transactions';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../theme';
import type { ReportExpense, Transaction } from '../../types';
import { monthRange } from '../../utils/calculations';
import { formatMonthLabel } from '../../utils/formatters';
import { formatBaht } from '../../utils/money';
import { categoryTotals } from '../../utils/reports';

const RECENT_LIMIT = 3;

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();
  const [refreshing, setRefreshing] = useState(false);
  const [monthExpenses, setMonthExpenses] = useState<ReportExpense[]>([]);

  const accounts = useAppStore((s) => s.accounts);
  const totalSatang = useAppStore((s) => s.totalSatang);
  const monthExpenseSatang = useAppStore((s) => s.monthExpenseSatang);
  const monthIncomeSatang = useAppStore((s) => s.monthIncomeSatang);
  const transactions = useAppStore((s) => s.transactions);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const openMenu = useTransactionMenu(db);

  const reload = useCallback(async () => {
    try {
      await refreshAll(db);
      const now = new Date();
      const { startIso, endIso } = monthRange(now.getFullYear(), now.getMonth());
      setMonthExpenses(await listExpensesInRange(db, startIso, endIso));
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

  // The ring reads the same eligible-expense query the report uses, so the two cannot disagree.
  const categories = useMemo(() => categoryTotals(monthExpenses), [monthExpenses]);
  const monthTotalSatang = useMemo(
    () => categories.reduce((sum, entry) => sum + entry.satang, 0),
    [categories]
  );

  const activeAccounts = accounts.filter((account) => account.is_active === 1);
  const recent = transactions.slice(0, RECENT_LIMIT);
  const nameOf = (id: string) => accounts.find((account) => account.id === id)?.name ?? 'ไม่พบบัญชี';
  const openAdd = (accountId?: string) => router.push({ pathname: '/add', params: { accountId } });
  const openEdit = (transaction: Transaction) =>
    router.push({
      pathname: transaction.type === 'TRANSFER' ? '/transfer' : '/add',
      params: { id: transaction.id },
    });
  const monthLabel = formatMonthLabel(new Date());

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
          <View style={styles.headerTexts}>
            <Text style={styles.title}>Pocket Ledger</Text>
            <Text style={styles.subtitle}>{monthLabel}</Text>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="ตั้งค่า"
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
          >
            <Ionicons name="settings-outline" size={18} color={palette.muted} />
          </PressableScale>
        </View>

        <Entrance>
          <SummaryCard
            totalSatang={totalSatang}
            accountCount={activeAccounts.length}
            incomeSatang={monthIncomeSatang}
            expenseSatang={monthExpenseSatang}
          />
        </Entrance>

        <Entrance delayMs={60}>
          <SectionHead title="รายจ่ายตามหมวด" hint={`เดือนนี้ ${formatBaht(monthTotalSatang)}`} />
          <CategoryRingCard totals={categories} monthTotalSatang={monthTotalSatang} />
        </Entrance>

        {activeAccounts.length === 0 ? (
          <>
            <SectionHead title="บัญชีของฉัน" hint="ยังไม่มีบัญชี" />
            <Card style={styles.empty}>
              <Text style={styles.emptyTitle}>สร้างบัญชีแรกของคุณ</Text>
              <Text style={styles.emptyBody}>
                เริ่มจากกระเป๋าเงินสดหรือบัญชีธนาคาร แล้วบันทึกรายการได้ทันที
              </Text>
              <Button label="เพิ่มบัญชี" onPress={() => router.push('/account/new')} />
            </Card>
          </>
        ) : (
          <>
            <SectionHead title="บัญชีของฉัน" hint="แตะเพื่อบันทึก · กดค้างเพื่อปรับยอด" />
            <Card style={styles.accountsCard}>
              {activeAccounts.map((account, index) => (
                <Entrance key={account.id} delayMs={100 + index * 40}>
                  <AccountRow
                    account={account}
                    onPress={() => openAdd(account.id)}
                    onLongPress={() =>
                      router.push({ pathname: '/reconcile', params: { accountId: account.id } })
                    }
                  />
                </Entrance>
              ))}
            </Card>
            <View style={styles.actions}>
              <Button
                label="โอนเงิน"
                variant="secondary"
                onPress={() => router.push('/transfer')}
                style={styles.action}
              />
              <Button
                label="ปรับยอด"
                variant="secondary"
                onPress={() => router.push('/reconcile')}
                style={styles.action}
              />
            </View>
          </>
        )}

        <SectionHead
          title="รายการล่าสุด"
          action={
            <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/transactions')}>
              แสดงทั้งหมด
            </Text>
          }
        />
        {recent.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyBody}>ยังไม่มีรายการ — กดปุ่ม + เพื่อเริ่มบันทึก</Text>
          </Card>
        ) : (
          <View style={styles.recentList}>
            {recent.map((transaction: Transaction, index) => (
              <Entrance key={transaction.id} delayMs={160 + index * 50}>
                <TransactionItem
                  transaction={transaction}
                  accountLabel={nameOf(transaction.account_id)}
                  destinationLabel={
                    transaction.destination_account_id
                      ? nameOf(transaction.destination_account_id)
                      : undefined
                  }
                  onPress={() => openEdit(transaction)}
                  onLongPress={() => openMenu(transaction)}
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
  // 96pt clears the floating tab bar so the last card is never hidden behind the centre button.
  content: { paddingHorizontal: spacing.lg, paddingBottom: 96, gap: spacing.sm },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTexts: { gap: 3, flex: 1, minWidth: 0 },
  title: { fontSize: 25, fontWeight: '700' as const, letterSpacing: -0.4, color: palette.text },
  subtitle: { fontSize: 13, color: palette.muted },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  link: { fontSize: 13, fontWeight: '600' as const, color: palette.primaryText },
  accountsCard: { gap: spacing.sm },
  actions: { flexDirection: 'row' as const, gap: spacing.sm },
  action: { flex: 1 },
  empty: { gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700' as const, color: palette.text },
  emptyBody: { fontSize: 13, color: palette.muted },
  recentList: { gap: spacing.sm },
}));
