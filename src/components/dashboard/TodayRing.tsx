import { StyleSheet, Text, View } from 'react-native';
import { CATEGORY_COLORS } from '../../theme';
import type { CategoryTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';

const DOTS = 36;
const DOT = 11;

/**
 * "รายจ่ายวันนี้แยกตามหมวด": a track ring with one coloured run of dots per category, the
 * biggest category named in the centre. Drawn with plain views — no SVG dependency — and every
 * segment is described in the accessibility label, so the colours are never the only channel.
 */
export function TodayRing({ totals, size = 100 }: { totals: CategoryTotal[]; size?: number }) {
  const counts = splitDots(totals, DOTS);
  const radius = size / 2 - DOT / 2;
  const top = totals[0];

  const label = top
    ? `รายจ่ายวันนี้ ${formatBaht(top.satang)} จาก ${totals.length} หมวด · ` +
      totals.map((entry) => `${entry.category} ${formatBaht(entry.satang)}`).join(', ')
    : 'ยังไม่มีรายจ่ายวันนี้';

  // Each category owns a contiguous run of dots, so the runs tile the whole ring.
  const dots: { angle: number; color: string }[] = [];
  counts.forEach((count, categoryIndex) => {
    const color = CATEGORY_COLORS[categoryIndex % CATEGORY_COLORS.length];
    for (let offset = 0; offset < count && dots.length < DOTS; offset += 1) {
      const index = dots.length;
      dots.push({ angle: (-90 + (index * 360) / DOTS) * (Math.PI / 180), color });
    }
  });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.wrapper, { width: size, height: size }]}
    >
      <View style={[styles.track, { width: size, height: size, borderRadius: size / 2 }]} />
      {dots.map((dot, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: size / 2 + radius * Math.cos(dot.angle) - DOT / 2,
            top: size / 2 + radius * Math.sin(dot.angle) - DOT / 2,
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: dot.color,
          }}
        />
      ))}
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.caption} numberOfLines={2}>
          {top ? top.category : 'วันนี้'}
        </Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
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

  // Trim from the biggest run until the ring adds up, then hand the remainder back to it.
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

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  // The unspent remainder of the ring, matching the mockup's 16% white track.
  track: { position: 'absolute', borderWidth: DOT, borderColor: 'rgba(255,255,255,0.16)' },
  center: { alignItems: 'center', gap: 2, paddingHorizontal: 14 },
  caption: {
    fontSize: 9,
    lineHeight: 12,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
