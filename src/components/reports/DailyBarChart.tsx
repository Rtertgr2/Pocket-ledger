import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { spacing } from '../../theme';
import type { DailyTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';

const MAX_BAR_HEIGHT = 96;

/**
 * One bar per day of the month, drawn with plain views — no chart library, no SVG, and the
 * numbers come from the same aggregation the burn rate uses.
 */
export function DailyBarChart({ totals, peak }: { totals: DailyTotal[]; peak: number }) {
  const styles = useStyles();
  const totalSatang = totals.reduce((sum, day) => sum + day.satang, 0);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        totalSatang === 0
          ? 'ยังไม่มีรายจ่ายในเดือนนี้'
          : `กราฟรายจ่ายรายวัน สูงสุด ${formatBaht(peak)} รวม ${formatBaht(totalSatang)}`
      }
    >
      <View style={styles.bars}>
        {totals.map((day) => {
          const height = peak > 0 ? Math.max(2, Math.round((day.satang / peak) * MAX_BAR_HEIGHT)) : 2;
          return (
            <View key={day.day} style={styles.slot}>
              <View style={[styles.bar, { height }, day.satang === 0 ? styles.empty : null]} />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>1</Text>
        <Text style={styles.axisLabel}>{Math.ceil(totals.length / 2)}</Text>
        <Text style={styles.axisLabel}>{totals.length}</Text>
      </View>
      <Text style={styles.hint}>
        {totalSatang > 0
          ? `สูงสุด ${formatBaht(peak)} · เฉลี่ย ${formatBaht(Math.round(totalSatang / totals.length))}/วัน`
          : 'ยังไม่มีรายจ่ายในเดือนนี้'}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  bars: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    height: MAX_BAR_HEIGHT,
    gap: 2,
  },
  slot: { flex: 1, justifyContent: 'flex-end' as const },
  bar: { backgroundColor: palette.primary, borderRadius: 3, width: '100%' },
  empty: { backgroundColor: palette.surfaceMuted },
  axis: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginTop: spacing.xs },
  axisLabel: { fontSize: 10, color: palette.muted, fontVariant: ['tabular-nums'] as const },
  hint: { fontSize: 11, color: palette.muted, marginTop: spacing.xs },
}));
