import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { heroShadow, radius, spacing } from '../../theme';
import type { CategoryTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';
import { TodayRing } from './TodayRing';

interface TotalBalanceCardProps {
  totalSatang: number;
  accountCount: number;
  /** Today's expenses grouped by category — what the ring on the right shows. */
  todayTotals: CategoryTotal[];
}

/**
 * The hero: the charcoal-green block from the reference mockup — headline total on the left,
 * today's spending by category on the right, with the biggest category named in the middle.
 */
export function TotalBalanceCard({ totalSatang, accountCount, todayTotals }: TotalBalanceCardProps) {
  const styles = useStyles();
  const top = todayTotals[0];

  return (
    <View
      accessibilityLabel={
        `ยอดรวมทุกบัญชี ${formatBaht(totalSatang)} จาก ${accountCount} บัญชี` +
        (top ? ` · วันนี้ใช้ไป ${formatBaht(top.satang)} ที่${top.category}` : ' · วันนี้ยังไม่มีรายจ่าย')
      }
      style={styles.card}
    >
      <View style={styles.texts}>
        <Text style={styles.label}>ยอดรวมทุกบัญชี</Text>
        <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
          {formatBaht(totalSatang)}
        </Text>
        <Text style={styles.caption}>{accountCount} บัญชีที่ใช้งาน</Text>
      </View>
      <TodayRing totals={todayTotals} />
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.hero,
    borderRadius: radius.lg,
    padding: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    overflow: 'hidden' as const,
    ...heroShadow,
  },
  texts: { flex: 1, gap: spacing.xs, minWidth: 0 },
  label: { color: palette.onPrimaryMuted, fontSize: 12 },
  amount: {
    color: palette.onPrimary,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as const,
  },
  caption: { color: palette.onPrimaryMuted, fontSize: 12 },
}));
