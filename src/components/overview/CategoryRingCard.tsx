import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { cardShadow, categoryColor, radius, spacing } from '../../theme';
import type { CategoryTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';

const SIZE = 108;
const DOTS = 44;
const DOT = 10;

/**
 * "รายจ่ายตามหมวด": one coloured run of dots per category, biggest category named in the centre,
 * legend on the right. Drawn with plain views — the glyph-free approach keeps the ring honest in
 * both schemes, and the legend carries every number so colour is never the only channel.
 */
export function CategoryRingCard({
  totals,
  monthTotalSatang,
}: {
  totals: CategoryTotal[];
  monthTotalSatang: number;
}) {
  const styles = useStyles();
  const top = totals[0];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ring totals={totals} />
        <View style={styles.legend}>
          {totals.length === 0 ? (
            <Text style={styles.empty}>ยังไม่มีรายจ่ายในเดือนนี้</Text>
          ) : (
            totals.slice(0, 6).map((entry, index) => (
              <View key={entry.category} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: categoryColor(index) }]} />
                <Text style={styles.name} numberOfLines={1}>
                  {entry.category}
                </Text>
                <Text style={styles.amount}>{formatBaht(entry.satang)}</Text>
                <Text style={styles.pct}>{Math.round(entry.share * 100)}%</Text>
              </View>
            ))
          )}
        </View>
      </View>
      <Text style={styles.footer}>
        {monthTotalSatang > 0
          ? `รวมเดือนนี้ ${formatBaht(monthTotalSatang)}${top ? ` · มากสุด ${top.category}` : ''}`
          : 'เดือนนี้ยังไม่มีรายจ่าย'}
      </Text>
    </View>
  );
}

function Ring({ totals }: { totals: CategoryTotal[] }) {
  const styles = useStyles();
  const top = totals[0];
  const radiusPx = SIZE / 2 - DOT / 2;

  const runs: { color: string; dots: number }[] = splitDots(totals, DOTS).map((count, index) => ({
    color: categoryColor(index),
    dots: count,
  }));
  const dots: { x: number; y: number; color: string }[] = [];
  let index = 0;
  for (const run of runs) {
    for (let n = 0; n < run.dots && index < DOTS; n += 1, index += 1) {
      const angle = (-90 + (index * 360) / DOTS) * (Math.PI / 180);
      dots.push({
        x: SIZE / 2 + radiusPx * Math.cos(angle) - DOT / 2,
        y: SIZE / 2 + radiusPx * Math.sin(angle) - DOT / 2,
        color: run.color,
      });
    }
  }

  return (
    <View
      style={[styles.ring, { width: SIZE, height: SIZE }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        top
          ? `รายจ่ายเดือนนี้ มากที่สุดที่หมวด ${top.category} ${formatBaht(top.satang)}`
          : 'ยังไม่มีรายจ่ายในเดือนนี้'
      }
    >
      <View
        style={[
          styles.ringTrack,
          { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: DOT },
        ]}
      />
      {dots.map((dot, dotIndex) => (
        <View
          key={dotIndex}
          style={{
            position: 'absolute',
            left: dot.x,
            top: dot.y,
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: dot.color,
          }}
        />
      ))}
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.ringCaption} numberOfLines={2}>
          {top ? top.category : 'เดือนนี้'}
        </Text>
        <Text style={styles.ringValue} numberOfLines={1} adjustsFontSizeToFit>
          {top ? formatBaht(top.satang) : '—'}
        </Text>
      </View>
    </View>
  );
}

/**
 * Dots per category: proportional to the share, at least one so a small category is still
 * visible, then trimmed from the biggest runs until the ring adds up to exactly `total`.
 */
function splitDots(totals: CategoryTotal[], total: number): number[] {
  if (totals.length === 0) return [];
  const counts = totals.map((entry) => Math.max(1, Math.round(entry.share * total)));
  let sum = counts.reduce((accumulator, count) => accumulator + count, 0);

  while (sum > total) {
    const biggest = counts.indexOf(Math.max(...counts));
    if (counts[biggest] <= 1) break;
    counts[biggest] -= 1;
    sum -= 1;
  }
  while (sum < total) {
    counts[0] += 1;
    sum += 1;
  }

  return counts;
}

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...cardShadow,
  },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.lg },
  ring: { alignItems: 'center' as const, justifyContent: 'center' as const, flex: 0 },
  ringTrack: { position: 'absolute', borderColor: palette.tile },
  ringCenter: { alignItems: 'center' as const, gap: 2, paddingHorizontal: 20 },
  ringCaption: {
    fontSize: 9,
    lineHeight: 12,
    color: palette.muted,
    textAlign: 'center' as const,
  },
  ringValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  legend: { flex: 1, gap: 8, minWidth: 0 },
  legendRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 12, color: palette.text },
  amount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  pct: {
    width: 34,
    textAlign: 'right' as const,
    fontSize: 11,
    color: palette.muted,
    fontVariant: ['tabular-nums'] as const,
  },
  empty: { fontSize: 12, color: palette.muted },
  footer: { fontSize: 11, color: palette.muted },
}));
