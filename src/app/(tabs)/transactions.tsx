import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Chip } from '../../components/common/Chip';
import { PressableScale } from '../../components/common/PressableScale';
import { Screen } from '../../components/common/Screen';
import { useToast } from '../../components/common/Toast';
import {
  FilterSheet,
  type RangeFilter,
  type TypeFilter,
} from '../../components/transactions/FilterSheet';
import { TransactionItem } from '../../components/transactions/TransactionItem';
import { EXPENSE_CATEGORIES } from '../../categories';
import { useTransactionMenu } from '../../hooks/useTransactionMenu';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import type { TransactionFilter } from '../../services/db/transactions';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../theme';
import { monthRange } from '../../utils/calculations';
import { startOfLocalDay } from '../../utils/dates';
import { groupByDay } from '../../utils/formatters';
import { formatBaht } from '../../utils/money';

/** Rows shown per day before the "more" row; a long Saturday should not bury the week. */
const DAY_LIMIT = 4;

const ALL_CHIP = 'all';

/**
 * The date window for a range chip, as ISO bounds on whole local days (upper bound exclusive).
 * Built from local parts so "7 วันล่าสุด" means the seven days the user just lived through.
 */
function rangeBounds(range: RangeFilter): { from: string; to: string } | null {
  if (range === 'ALL') return null;
  const today = startOfLocalDay(new Date());
  if (range === 'MONTH') {
    const { startIso, endIso } = monthRange(today.getFullYear(), today.getMonth());
    return { from: startIso, to: endIso };
  }
  const days = range === '7' ? 7 : 30;
  return {
    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)).toISOString(),
    to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
  };
}

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [chipKey, setChipKey] = useState(ALL_CHIP);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('ALL');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const hasMore = useAppStore((s) => s.hasMore);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const loadMoreTransactions = useAppStore((s) => s.loadMoreTransactions);
  const setLedgerFilter = useAppStore((s) => s.setLedgerFilter);
  const filterCount = useAppStore((s) => s.filterCount);
  const openMenu = useTransactionMenu(db);

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

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.is_active === 1),
    [accounts]
  );

  /** Filters live in SQL: the ledger only holds the pages fetched so far. */
  const applyFilter = useCallback(
    async (
      nextChip: string,
      nextQuery: string,
      nextType: TypeFilter = 'ALL',
      nextRange: RangeFilter = 'ALL'
    ) => {
      const filter: TransactionFilter = {};
      if (nextChip.startsWith('acct:')) filter.accountId = nextChip.slice('acct:'.length);
      else if (nextChip.startsWith('cat:')) filter.category = nextChip.slice('cat:'.length);
      const query = nextQuery.trim();
      if (query) filter.query = query;
      if (nextType !== 'ALL') filter.type = nextType;
      const bounds = rangeBounds(nextRange);
      if (bounds) {
        filter.from = bounds.from;
        filter.to = bounds.to;
      }
      try {
        await setLedgerFilter(db, filter);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'กรองรายการไม่สำเร็จ', 'error');
      }
    },
    [db, setLedgerFilter, showToast]
  );

  // One debounced query for every control: typing and chip taps take the same path.
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilter(chipKey, queryText, typeFilter, rangeFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [applyFilter, chipKey, queryText, typeFilter, rangeFilter]);

  function clearFilters() {
    setQueryText('');
    setChipKey(ALL_CHIP);
    setTypeFilter('ALL');
    setRangeFilter('ALL');
  }

  const chips = useMemo(
    () => [
      { key: ALL_CHIP, label: 'ทั้งหมด' },
      ...activeAccounts.map((account) => ({ key: `acct:${account.id}`, label: account.name })),
      ...EXPENSE_CATEGORIES.map((category) => ({ key: `cat:${category}`, label: category })),
    ],
    [activeAccounts]
  );

  const filterActive =
    chipKey !== ALL_CHIP ||
    queryText.trim().length > 0 ||
    typeFilter !== 'ALL' ||
    rangeFilter !== 'ALL';
  const nameOf = useCallback(
    (id: string) => accounts.find((account) => account.id === id)?.name ?? 'ไม่พบบัญชี',
    [accounts]
  );

  // Day sections keep their own totals from the full day, even when only four rows are shown.
  const sections = useMemo(() => {
    return groupByDay(transactions).map((section) => {
      const rows = expanded[section.key] ? section.data : section.data.slice(0, DAY_LIMIT);
      const totals = section.data.reduce(
        (sum, item) => {
          if (item.type === 'INCOME') sum.income += item.amount_satang;
          if (item.type === 'EXPENSE') sum.expense += item.amount_satang;
          return sum;
        },
        { income: 0, expense: 0 }
      );
      const rest = section.data.slice(rows.length);
      const restExpense = rest
        .filter((item) => item.type === 'EXPENSE')
        .reduce((sum, item) => sum + item.amount_satang, 0);
      return {
        ...section,
        data: rows,
        income: totals.income,
        expense: totals.expense,
        hiddenCount: rest.length,
        restExpense,
      };
    });
  }, [transactions, expanded]);

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
        <Text style={styles.title}>รายการ</Text>
        <Text style={styles.subtitle}>
          {filterActive ? filterCount : transactions.length}
          {filterActive ? '' : hasMore ? '+' : ''} รายการ · {activeAccounts.length} บัญชี
          {filterActive ? ' · กำลังกรอง' : ''}
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={palette.muted} />
          <TextInput
            value={queryText}
            onChangeText={setQueryText}
            placeholder="ค้นหารายการ หมวด หรือบัญชี..."
            placeholderTextColor={palette.muted}
            selectionColor={palette.primaryText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="ค้นหารายการ"
            style={styles.searchInput}
          />
          {queryText.length > 0 ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="ล้างคำค้น"
              onPress={() => setQueryText('')}
              style={styles.clearIcon}
            >
              <Ionicons name="close-circle" size={16} color={palette.muted} />
            </PressableScale>
          ) : null}
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="กรองรายการ"
          onPress={() => setSheetOpen(true)}
          style={[styles.filterButton, filterActive ? styles.filterButtonActive : null]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filterActive ? palette.onPrimary : palette.text}
          />
        </PressableScale>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsRow}
      >
        {chips.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            selected={chip.key === chipKey}
            onPress={() => setChipKey(chip.key)}
          />
        ))}
      </ScrollView>

      {sheetOpen ? (
        <FilterSheet
          type={typeFilter}
          range={rangeFilter}
          onApply={(nextType, nextRange) => {
            setTypeFilter(nextType);
            setRangeFilter(nextRange);
            setSheetOpen(false);
          }}
          onReset={() => {
            clearFilters();
            setSheetOpen(false);
          }}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}

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
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSums}>
              จ่าย {formatBaht(section.expense)} · รับ {formatBaht(section.income)}
            </Text>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.hiddenCount > 0 ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`แสดงรายการเพิ่มอีก ${section.hiddenCount} รายการของวันนี้`}
              onPress={() =>
                setExpanded((current) => ({ ...current, [section.key]: true }))
              }
              style={styles.moreRow}
            >
              <Text style={styles.moreText}>
                <Text style={styles.moreStrong}>อีก {section.hiddenCount} รายการ</Text> · แตะเพื่อขยาย
              </Text>
              <Text style={styles.moreAmount}>{formatBaht(section.restExpense)}</Text>
            </PressableScale>
          ) : null
        }
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            accountLabel={nameOf(item.account_id)}
            destinationLabel={
              item.destination_account_id ? nameOf(item.destination_account_id) : undefined
            }
            onPress={() =>
              router.push({
                pathname: item.type === 'TRANSFER' ? '/transfer' : '/add',
                params: { id: item.id },
              })
            }
            onLongPress={() => openMenu(item)}
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
            <Text style={styles.emptyTitle}>
              {filterActive ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีรายการ'}
            </Text>
            <Text style={styles.subtitle}>
              {filterActive ? 'ลองล้างคำค้นหรือเลือก “ทั้งหมด”' : 'กดปุ่ม + เพื่อบันทึกรายการแรก'}
            </Text>
            {filterActive ? (
              <PressableScale onPress={clearFilters} style={styles.clearButton}>
                <Text style={styles.clearLabel}>ล้างตัวกรอง</Text>
              </PressableScale>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 3,
  },
  title: { fontSize: 25, fontWeight: '700' as const, letterSpacing: -0.4, color: palette.text },
  subtitle: { fontSize: 12, color: palette.muted },
  searchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  filterButtonActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  searchBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: { flex: 1, minWidth: 0, padding: 0, fontSize: 13, color: palette.text },
  clearIcon: { padding: 2 },
  chipsRow: { maxHeight: 52, marginTop: spacing.xs },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  // 96pt clears the floating tab bar so the last row is never hidden behind the centre button.
  content: { paddingHorizontal: spacing.lg, paddingBottom: 96, gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700' as const, color: palette.muted },
  sectionSums: { fontSize: 11, color: palette.muted, fontVariant: ['tabular-nums'] as const },
  moreRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  moreText: { flex: 1, fontSize: 12, color: palette.muted },
  moreStrong: { color: palette.text, fontWeight: '700' as const },
  moreAmount: {
    fontSize: 12,
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
  clearButton: {
    marginTop: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  clearLabel: { fontSize: 13, fontWeight: '600' as const, color: palette.text },
}));
