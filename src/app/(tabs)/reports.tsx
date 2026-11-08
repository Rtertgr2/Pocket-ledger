import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/common/Card';
import { PressableScale } from '../../components/common/PressableScale';
import { Screen } from '../../components/common/Screen';
import { SectionHead } from '../../components/common/SectionHead';
import { useToast } from '../../components/common/Toast';
import { CategoryBreakdown } from '../../components/reports/CategoryBreakdown';
import { DailyBarChart } from '../../components/reports/DailyBarChart';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { listExpensesInRange, sumIncomeInRange } from '../../services/db/transactions';
import { useAppStore } from '../../store/useAppStore';
import { radius, spacing } from '../../theme';
import type { ReportExpense } from '../../types';
import { daysInMonth, monthRange } from '../../utils/calculations';
import { formatMonthLabel } from '../../utils/formatters';
import { formatBaht } from '../../utils/money';
import { categoryTotals, dailyExpenseTotals, peakDailyTotal } from '../../utils/reports';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function ReportsScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const { palette } = useTheme();
  const styles = useStyles();
  const setLedgerFilter = useAppStore((s) => s.setLedgerFilter);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [expenses, setExpenses] = useState<ReportExpense[]>([]);
  const [incomeSatang, setIncomeSatang] = useState(0);
  const [loading, setLoading] = useState(true);

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();
  const { startIso, endIso } = monthRange(year, monthIndex);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [monthExpenses, monthIncome] = await Promise.all([
        listExpensesInRange(db, startIso, endIso),
        sumIncomeInRange(db, startIso, endIso),
      ]);
      setExpenses(monthExpenses);
      setIncomeSatang(monthIncome);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'โหลดรายงานไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [db, startIso, endIso, showToast]);

  // Re-reads on focus (a write in a modal changes the month) and whenever the month changes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const days = useMemo(
    () => dailyExpenseTotals(expenses, year, monthIndex),
    [expenses, year, monthIndex]
  );
  const categories = useMemo(() => categoryTotals(expenses), [expenses]);
  const totalSatang = days.reduce((sum, day) => sum + day.satang, 0);
  const peak = peakDailyTotal(days);

  // The average uses the days that have actually happened: a month in progress must not look cheap
  // just because its future days are empty.
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIndex;
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth(year, monthIndex);
  const averageSatang = elapsedDays > 0 ? Math.round(totalSatang / elapsedDays) : 0;

  const currentMonth = startOfMonth(now);
  const canGoForward = cursor.getTime() < currentMonth.getTime();
  const shiftMonth = (delta: number) => setCursor(new Date(year, monthIndex + delta, 1));

  async function openCategory(category: string) {
    await setLedgerFilter(db, { category });
    router.push('/transactions');
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>รายงาน</Text>
          <Text style={styles.subtitle}>รายจ่ายที่บันทึกจริง (ไม่รวมโอนและปรับยอด)</Text>
        </View>

        <View style={styles.monthBar}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="เดือนก่อนหน้า"
            onPress={() => shiftMonth(-1)}
            style={styles.monthButton}
          >
            <Text style={styles.monthArrow}>‹</Text>
          </PressableScale>
          <Text style={styles.monthLabel}>{formatMonthLabel(cursor)}</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="เดือนถัดไป"
            accessibilityState={{ disabled: !canGoForward }}
            disabled={!canGoForward}
            onPress={() => shiftMonth(1)}
            style={[styles.monthButton, canGoForward ? null : styles.monthButtonDisabled]}
          >
            <Text style={styles.monthArrow}>›</Text>
          </PressableScale>
        </View>

        <Card style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>รับเดือนนี้</Text>
            <Text style={[styles.statValue, styles.incomeValue]} numberOfLines={1} adjustsFontSizeToFit>
              {formatBaht(incomeSatang)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>จ่าย · {expenses.length} รายการ</Text>
            <Text style={[styles.statValue, styles.expenseValue]} numberOfLines={1} adjustsFontSizeToFit>
              {formatBaht(totalSatang)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>เฉลี่ย / วัน</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatBaht(averageSatang)}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>รายจ่ายรายวัน</Text>
          {loading ? (
            <ActivityIndicator color={palette.primaryText} />
          ) : (
            <DailyBarChart totals={days} peak={peak} averageSatang={averageSatang} />
          )}
        </Card>

        <SectionHead title="หมวดหมู่" hint="แตะหมวดเพื่อดูรายการ" />
        <Card style={styles.card}>
          {loading ? (
            <ActivityIndicator color={palette.primaryText} />
          ) : (
            <CategoryBreakdown totals={categories} onSelect={openCategory} />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  // 96pt clears the floating tab bar so the last card is never hidden behind the centre button.
  content: { paddingHorizontal: spacing.lg, paddingBottom: 96, gap: spacing.sm },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: 3 },
  title: { fontSize: 25, fontWeight: '700' as const, letterSpacing: -0.4, color: palette.text },
  subtitle: { fontSize: 12, color: palette.muted },
  monthBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  monthButtonDisabled: { opacity: 0.3 },
  monthArrow: { fontSize: 22, fontWeight: '700' as const, color: palette.muted },
  monthLabel: { fontSize: 15, fontWeight: '700' as const, color: palette.text },
  statsCard: { flexDirection: 'row' as const, gap: spacing.sm },
  stat: { flex: 1, gap: 6, minWidth: 0 },
  statLabel: { fontSize: 11, color: palette.muted, lineHeight: 15 },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  incomeValue: { color: palette.income },
  expenseValue: { color: palette.expense },
  card: { gap: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700' as const, color: palette.text },
}));
