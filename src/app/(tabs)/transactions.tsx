import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, Text, View } from 'react-native';
import { PressableScale } from '../../components/common/PressableScale';
import { Screen } from '../../components/common/Screen';
import { useToast } from '../../components/common/Toast';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { useDeleteTransaction } from '../../hooks/useDeleteTransaction';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../theme';
import { groupByDay } from '../../utils/formatters';
import { formatBaht } from '../../utils/money';

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();
  const [refreshing, setRefreshing] = useState(false);

  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const hasMore = useAppStore((s) => s.hasMore);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const loadMoreTransactions = useAppStore((s) => s.loadMoreTransactions);
  const confirmDelete = useDeleteTransaction(db);
  const [loadingMore, setLoadingMore] = useState(false);

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

  const nameOf = useCallback(
    (id: string) => accounts.find((account) => account.id === id)?.name ?? 'ไม่พบบัญชี',
    [accounts]
  );
  const sections = useMemo(() => groupByDay(transactions), [transactions]);

  // The ledger only holds the pages fetched so far; appending one page at a time keeps the
  // first paint fast even after a year of entries.
  async function onEndReached() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadMoreTransactions(db);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'โหลดรายการเพิ่มไม่สำเร็จ', 'error');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>รายการทั้งหมด</Text>
        <Text style={styles.subtitle}>
          {transactions.length} รายการล่าสุด{hasMore ? ' · เลื่อนลงเพื่อดูเพิ่ม' : ''}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primaryText}
            colors={[palette.primaryText]}
            progressBackgroundColor={palette.surface}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        renderSectionHeader={({ section }) => {
          const income = section.data
            .filter((item) => item.type === 'INCOME')
            .reduce((sum, item) => sum + item.amount_satang, 0);
          const expense = section.data
            .filter((item) => item.type === 'EXPENSE')
            .reduce((sum, item) => sum + item.amount_satang, 0);
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSums}>
                รับ {formatBaht(income)} · จ่าย {formatBaht(expense)}
              </Text>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            accountLabel={nameOf(item.account_id)}
            destinationLabel={item.destination_account_id ? nameOf(item.destination_account_id) : undefined}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} color={palette.primaryText} />
          ) : hasMore ? undefined : transactions.length > 0 ? (
            <Text style={styles.footerText}>สิ้นสุดรายการ</Text>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>ยังไม่มีรายการ</Text>
            <Text style={styles.subtitle}>กดปุ่ม + เพื่อบันทึกรายการแรก</Text>
          </View>
        }
      />

      <PressableScale
        accessibilityLabel="บันทึกรายการใหม่"
        onPress={() => router.push('/add')}
        toScale={0.94}
        style={styles.fab}
      >
        <Text style={styles.fabLabel}>+</Text>
      </PressableScale>
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  title: { fontSize: 25, fontWeight: '700' as const, letterSpacing: -0.3, color: palette.text },
  subtitle: { fontSize: 12, color: palette.muted },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700' as const, color: palette.muted },
  sectionSums: {
    fontSize: 11,
    color: palette.muted,
    fontVariant: ['tabular-nums'] as const,
  },
  footer: { paddingVertical: spacing.lg },
  footerText: {
    textAlign: 'center' as const,
    paddingVertical: spacing.lg,
    fontSize: 11,
    color: palette.muted,
  },
  empty: { alignItems: 'center' as const, paddingTop: spacing.xxl, gap: spacing.xs },
  emptyTitle: { fontSize: 16, fontWeight: '700' as const, color: palette.text },
  fab: {
    position: 'absolute' as const,
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    elevation: 4,
  },
  fabLabel: { color: palette.onPrimary, fontSize: 28, fontWeight: '600' as const, marginTop: -2 },
}));
