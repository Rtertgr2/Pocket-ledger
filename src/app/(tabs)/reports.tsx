import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/common/Card';
import { Screen } from '../../components/common/Screen';
import { useToast } from '../../components/common/Toast';
import { CategoryBreakdown } from '../../components/reports/CategoryBreakdown';
import { DailyBarChart } from '../../components/reports/DailyBarChart';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { listExpensesInRange, sumIncomeInRange } from '../../services/db/transactions';
import { radius, spacing } from '../../theme';
import type { ReportExpense } from '../../types';
import { calculateDailyBurnRate, daysInMonth, monthRange } from '../../utils/calculations';
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
  const burnRateSatang = calculateDailyBurnRate(totalSatang, daysInMonth(year, monthIndex));

  const currentMonth = startOfMonth(new Date());
  const canGoForward = cursor.getTime() < currentMonth.getTime();
  const shiftMonth = (delta: number) => setCursor(new Date(year, monthIndex + delta, 1));

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>รายงาน</Text>
          <Text style={styles.subtitle}>รายจ่ายที่ถูกนับในค่าเฉลี่ย (ไม่รวมโอนและรายการปรับยอด)</Text>
        </View>

        <View style={styles.monthBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เดือนก่อนหน้า"
            onPress={() => shiftMonth(-1)}
            style={styles.monthButton}
          >
            <Text style={styles.monthArrow}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthLabel(cursor)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เดือนถัดไป"
            accessibilityState={{ disabled: !canGoForward }}
            disabled={!canGoForward}
            onPress={() => shiftMonth(1)}
            style={[styles.monthButton, canGoForward ? null : styles.monthButtonDisabled]}
          >
            <Text style={styles.monthArrow}>›</Text>
          </Pressable>
        </View>

        <Card style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>รายรับเดือนนี้</Text>
              <Text style={styles.summaryValue}>{formatBaht(incomeSatang)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>เฉลี่ย / วัน</Text>
              <Text style={styles.summaryValue}>{formatBaht(burnRateSatang)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>จำนวนรายการ</Text>
              <Text style={styles.summaryValue}>{expenses.length}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>รายจ่ายรายวัน</Text>
          {loading ? (
            <ActivityIndicator color={palette.primaryText} />
          ) : (
            <DailyBarChart totals={days} peak={peakDailyTotal(days)} />
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>รายจ่ายตามหมวด</Text>
          {loading ? (
            <ActivityIndicator color={palette.primaryText} />
          ) : (
            <CategoryBreakdown totals={categories} />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((palette) => ({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { paddingTop: spacing.md, gap: 2 },
  title: { fontSize: 25, fontWeight: '700' as const, letterSpacing: -0.3, color: palette.text },
  subtitle: { fontSize: 13, color: palette.muted },
  monthBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.sm,
  },
  monthButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  monthButtonDisabled: { opacity: 0.3 },
  monthArrow: { fontSize: 22, fontWeight: '700' as const, color: palette.primaryText },
  monthLabel: { fontSize: 15, fontWeight: '700' as const, color: palette.text },
  card: { gap: spacing.md },
  summaryRow: { flexDirection: 'row' as const, gap: spacing.sm },
  summaryItem: { flex: 1, gap: 2 },
  summaryLabel: { fontSize: 11, color: palette.muted, lineHeight: 15 },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: palette.text },
}));
