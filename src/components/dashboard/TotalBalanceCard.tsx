import { StyleSheet, Text, View } from 'react-native';
import { formatBaht } from '../../utils/money';
import { colors, radius, spacing } from '../../theme';

export function TotalBalanceCard({ totalSatang, accountCount }: { totalSatang: number; accountCount: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>ยอดรวมทุกบัญชี</Text>
      <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
        {formatBaht(totalSatang)}
      </Text>
      <Text style={styles.caption}>{accountCount} บัญชีที่ใช้งาน</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  amount: { color: colors.white, fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  caption: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
});
