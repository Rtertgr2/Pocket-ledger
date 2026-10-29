import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { useToast } from '../../components/common/Toast';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { useDeleteTransaction } from '../../hooks/useDeleteTransaction';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../theme';
import { groupByDay } from '../../utils/formatters';

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();
  const [refreshing, setRefreshing] = useState(false);

  const accounts = useAppStore((s) => s.accounts);
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

  const nameOf = useCallback(
    (id: string) => accounts.find((account) => account.id === id)?.name ?? 'ไม่พบบัญชี',
    [accounts]
  );
  const sections = useMemo(() => groupByDay(transactions), [transactions]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>รายการทั้งหมด</Text>
        <Text style={styles.subtitle}>{transactions.length} รายการล่าสุด</Text>
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
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.surface}
          />
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TransactionItem
              transaction={item}
              accountLabel={nameOf(item.account_id)}
              destinationLabel={item.destination_account_id ? nameOf(item.destination_account_id) : undefined}
              onLongPress={() => confirmDelete(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>ยังไม่มีรายการ</Text>
            <Text style={styles.subtitle}>กดปุ่ม + เพื่อบันทึกรายการแรก</Text>
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="บันทึกรายการใหม่"
        onPress={() => router.push('/add')}
        style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  title: { fontSize: 24, fontWeight: '800' as const, color: palette.text },
  subtitle: { fontSize: 12, color: palette.muted },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: palette.muted,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  row: {
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
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
  fabPressed: { opacity: 0.9 },
  fabLabel: { color: palette.onPrimary, fontSize: 28, fontWeight: '600' as const, marginTop: -2 },
}));
