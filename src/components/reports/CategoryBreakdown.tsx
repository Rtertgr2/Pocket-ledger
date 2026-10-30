import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import type { CategoryTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';

/** Horizontal share bars: the label is the story, the bar is the proportion. */
export function CategoryBreakdown({ totals }: { totals: CategoryTotal[] }) {
  const styles = useStyles();

  if (totals.length === 0) {
    return <Text style={styles.empty}>ยังไม่มีรายจ่ายในเดือนนี้</Text>;
  }

  return (
    <View style={styles.list}>
      {totals.map((entry) => (
        <View key={entry.category} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.category} numberOfLines={1}>
              {entry.category}
            </Text>
            <Text style={styles.amount}>{formatBaht(entry.satang)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(4, Math.round(entry.share * 100))}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  list: { gap: spacing.md },
  empty: { fontSize: 13, color: palette.muted },
  row: { gap: spacing.xs },
  rowHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    gap: spacing.sm,
  },
  category: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: palette.text },
  amount: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    overflow: 'hidden' as const,
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.primary },
}));
