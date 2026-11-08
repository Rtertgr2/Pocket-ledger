import { Text, View } from 'react-native';
import { PressableScale } from '../common/PressableScale';
import { makeStyles } from '../../providers/ThemeProvider';
import { categoryColor, radius } from '../../theme';
import type { CategoryTotal } from '../../utils/reports';
import { formatBaht } from '../../utils/money';

/**
 * Category rows: the bar is the share of the biggest category, the number next to it is the
 * share of the month, and the whole row is a shortcut into the ledger filtered by that category.
 */
export function CategoryBreakdown({
  totals,
  onSelect,
}: {
  totals: CategoryTotal[];
  onSelect?: (category: string) => void;
}) {
  const styles = useStyles();

  if (totals.length === 0) {
    return <Text style={styles.empty}>ยังไม่มีรายจ่ายในเดือนนี้</Text>;
  }

  const top = totals[0].satang;

  return (
    <View>
      {totals.map((entry, index) => {
        const color = categoryColor(index);
        const barWidth = top > 0 ? Math.max(4, Math.round((entry.satang / top) * 100)) : 4;
        const body = (
          <>
            <View style={styles.header}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.category} numberOfLines={1}>
                {entry.category}
              </Text>
              <Text style={styles.amount}>
                {formatBaht(entry.satang)}
                <Text style={styles.share}> · {Math.round(entry.share * 100)}%</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${barWidth}%`, backgroundColor: color }]} />
            </View>
          </>
        );

        return onSelect ? (
          <PressableScale
            key={entry.category}
            accessibilityRole="button"
            accessibilityLabel={`${entry.category} ${formatBaht(entry.satang)} ดูรายการ`}
            onPress={() => onSelect(entry.category)}
            toScale={0.99}
            style={styles.row}
          >
            {body}
          </PressableScale>
        ) : (
          <View key={entry.category} style={styles.row}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  empty: { fontSize: 13, color: palette.muted },
  row: { paddingVertical: 9, gap: 7 },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 5, flex: 0 },
  category: { flex: 1, fontSize: 13, color: palette.text, minWidth: 0 },
  amount: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  share: { color: palette.muted, fontWeight: '400' as const },
  track: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.tile,
    overflow: 'hidden' as const,
    marginLeft: 16,
  },
  fill: { height: '100%', borderRadius: radius.pill },
}));
