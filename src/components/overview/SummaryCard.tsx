import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { cardShadow, radius, spacing } from '../../theme';
import { formatBaht, formatSatangGrouped } from '../../utils/money';

interface SummaryCardProps {
  totalSatang: number;
  accountCount: number;
  /** This month's income and expense, so the chips answer "how is the month going". */
  incomeSatang: number;
  expenseSatang: number;
}

/** `formatBaht` keeps the sign after the currency mark; the chips want it in front. */
function signedBaht(satang: number, sign: '+' | '−' | ''): string {
  const body = formatSatangGrouped(Math.abs(satang));
  return satang < 0 ? `−฿${body}` : `${sign}฿${body}`;
}

/** The balance block from the mockup: total on top, month income/expense/left as chips. */
export function SummaryCard({ totalSatang, accountCount, incomeSatang, expenseSatang }: SummaryCardProps) {
  const styles = useStyles();
  const left = incomeSatang - expenseSatang;

  return (
    <View
      style={styles.card}
      accessibilityLabel={`ยอดรวมทุกบัญชี ${formatBaht(totalSatang)} จาก ${accountCount} บัญชี`}
    >
      <View style={styles.top}>
        <Text style={styles.label}>ยอดรวมทุกบัญชี</Text>
        <Text style={styles.countPill}>{accountCount} บัญชี</Text>
      </View>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
        {formatBaht(totalSatang)}
      </Text>
      <View style={styles.chips}>
        <View style={[styles.chip, styles.incomeChip]}>
          <Text style={styles.chipLabel}>รายรับ</Text>
          <Text style={[styles.chipValue, styles.incomeValue]}>{signedBaht(incomeSatang, '+')}</Text>
        </View>
        <View style={[styles.chip, styles.expenseChip]}>
          <Text style={styles.chipLabel}>รายจ่าย</Text>
          <Text style={[styles.chipValue, styles.expenseValue]}>{signedBaht(expenseSatang, '−')}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>เหลือ</Text>
          <Text style={styles.chipValue}>{signedBaht(left, '')}</Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: spacing.sm,
    ...cardShadow,
  },
  top: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  label: { fontSize: 12, color: palette.muted },
  countPill: {
    fontSize: 11,
    color: palette.muted,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
    marginBottom: 2,
  },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 7 },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: palette.tile,
  },
  incomeChip: { backgroundColor: palette.incomeSoft },
  expenseChip: { backgroundColor: palette.expenseSoft },
  chipLabel: { fontSize: 11, color: palette.muted },
  chipValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  incomeValue: { color: palette.income },
  expenseValue: { color: palette.expense },
}));
