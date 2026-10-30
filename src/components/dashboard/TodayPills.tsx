import { StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { CATEGORY_COLORS, cardShadow, radius, spacing } from '../../theme';
import type { CategoryTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';

/**
 * The breakdown under the hero card: one pill per category with its colour dot, so the ring
 * above has a readable legend right below it. The amount is text, so nothing depends on hue.
 */
export function TodayPills({ totals }: { totals: CategoryTotal[] }) {
  const styles = useStyles();

  if (totals.length === 0) {
    return <Text style={styles.empty}>ยังไม่มีรายจ่ายวันนี้</Text>;
  }

  return (
    <View style={styles.row}>
      {totals.map((entry, index) => (
        <View key={entry.category} style={styles.pill}>
          <View
            style={[styles.dot, { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }]}
          />
          <Text style={styles.label} numberOfLines={1}>
            {entry.category}
          </Text>
          <Text style={styles.amount}>{formatBaht(entry.satang)}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 11,
    maxWidth: '100%',
    ...cardShadow,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, color: palette.text, flexShrink: 1 },
  amount: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.text,
    fontVariant: ['tabular-nums'],
  },
  empty: { fontSize: 12, color: palette.muted },
}));
