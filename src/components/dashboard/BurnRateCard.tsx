import { StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import { formatBaht } from '../../utils/money';

export function BurnRateCard({ burnRateSatang, monthExpenseSatang }: { burnRateSatang: number; monthExpenseSatang: number }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>อัตราการใช้เงิน / วัน</Text>
        <Text style={styles.amount}>{formatBaht(burnRateSatang)}</Text>
      </View>
      <Text style={styles.hint}>
        อัตราการใช้เงินเทียบงบทั้งเดือน · เดือนนี้ใช้ไป {formatBaht(monthExpenseSatang)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row' as const, alignItems: 'baseline' as const, justifyContent: 'space-between' as const },
  label: { fontSize: 13, fontWeight: '600' as const, color: palette.muted },
  amount: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  hint: { fontSize: 11, color: palette.muted },
}));
