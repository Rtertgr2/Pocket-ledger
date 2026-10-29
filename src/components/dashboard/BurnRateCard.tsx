import { StyleSheet, Text, View } from 'react-native';
import { formatBaht } from '../../utils/money';
import { colors, radius, spacing } from '../../theme';

export function BurnRateCard({ burnRateSatang, monthExpenseSatang }: { burnRateSatang: number; monthExpenseSatang: number }) {
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  amount: { fontSize: 20, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 11, color: colors.muted },
});
