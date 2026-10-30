import { StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { cardShadow, radius, spacing } from '../../theme';
import { formatBaht } from '../../utils/money';

/**
 * "อัตราการใช้จ่าย / วัน" — this month's spend divided by the days elapsed so far. The note says
 * which denominator was used, or nothing at all when the month has no spending yet.
 */
export function BurnRateCard({ burnRateSatang, monthExpenseSatang }: { burnRateSatang: number; monthExpenseSatang: number }) {
  const styles = useStyles();
  const elapsedDays = new Date().getDate();

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>อัตราการใช้จ่าย / วัน</Text>
        <Text style={styles.amount}>{formatBaht(burnRateSatang)}</Text>
      </View>
      <Text style={styles.note}>
        {monthExpenseSatang > 0
          ? `เดือนนี้ใช้ไป ${formatBaht(monthExpenseSatang)} จาก ${elapsedDays} วัน`
          : 'ยังไม่มีรายจ่ายในเดือนนี้'}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    gap: spacing.xs,
    ...cardShadow,
  },
  row: { flexDirection: 'row' as const, alignItems: 'baseline' as const, justifyContent: 'space-between' as const },
  label: { fontSize: 13, color: palette.muted },
  amount: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  note: { fontSize: 12, color: palette.muted, lineHeight: 17 },
}));
