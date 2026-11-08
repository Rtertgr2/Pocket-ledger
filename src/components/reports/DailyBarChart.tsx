import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import type { DailyTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';

const MAX_BAR_HEIGHT = 112;

/**
 * One bar per day of the month with a dashed average line across it, drawn with plain views —
 * no chart library, no SVG, and the numbers come from the same aggregation the stats use.
 */
export function DailyBarChart({
  totals,
  peak,
  averageSatang,
}: {
  totals: DailyTotal[];
  peak: number;
  averageSatang: number;
}) {
  const styles = useStyles();
  const { palette } = useTheme();
  const totalSatang = totals.reduce((sum, day) => sum + day.satang, 0);
  const showAverage = totalSatang > 0 && peak > 0;

  // A month with no spending would otherwise draw 31 flat stubs and a tall empty card, so show a
  // short placeholder instead of a chart that carries no information.
  if (totalSatang === 0) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel="ยังไม่มีรายจ่ายในเดือนนี้"
        style={styles.emptyBox}
      >
        <Ionicons name="bar-chart-outline" size={20} color={palette.muted} />
        <Text style={styles.hint}>ยังไม่มีรายจ่ายในเดือนนี้</Text>
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        totalSatang === 0
          ? 'ยังไม่มีรายจ่ายในเดือนนี้'
          : `กราฟรายจ่ายรายวัน สูงสุด ${formatBaht(peak)} เฉลี่ย ${formatBaht(averageSatang)} รวม ${formatBaht(totalSatang)}`
      }
    >
      <View style={styles.chart}>
        {totals.map((day) => {
          const height = peak > 0 ? Math.max(4, Math.round((day.satang / peak) * MAX_BAR_HEIGHT)) : 4;
          return (
            <View key={day.day} style={styles.slot}>
              <View
                style={[
                  styles.bar,
                  { height: day.satang > 0 ? height : 4 },
                  day.satang === 0 ? styles.emptyBar : null,
                ]}
              />
            </View>
          );
        })}
        {showAverage ? (
          <View
            pointerEvents="none"
            style={[
              styles.averageLine,
              { bottom: `${Math.min(100, (averageSatang / peak) * 100)}%` },
            ]}
          >
            <Text style={styles.averageTag}>เฉลี่ย {formatBaht(averageSatang)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>1</Text>
        <Text style={styles.axisLabel}>{Math.ceil(totals.length / 2)}</Text>
        <Text style={styles.axisLabel}>{totals.length}</Text>
      </View>
      <Text style={styles.hint}>
        {totalSatang > 0
          ? `สูงสุด ${formatBaht(peak)} · เฉลี่ย ${formatBaht(averageSatang)}/วัน`
          : 'ยังไม่มีรายจ่ายในเดือนนี้'}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  chart: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    height: MAX_BAR_HEIGHT,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  slot: { flex: 1, justifyContent: 'flex-end' as const },
  bar: { backgroundColor: palette.primary, borderRadius: 3, width: '100%' },
  emptyBar: { backgroundColor: palette.tile },
  averageLine: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed' as const,
    borderTopColor: palette.muted,
    opacity: 0.75,
  },
  averageTag: {
    position: 'absolute' as const,
    right: 0,
    top: -9,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.muted,
    fontSize: 10,
    fontVariant: ['tabular-nums'] as const,
  },
  axis: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 7,
  },
  axisLabel: { fontSize: 10, color: palette.muted, fontVariant: ['tabular-nums'] as const },
  hint: { fontSize: 11, color: palette.muted },
  emptyBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
}));
