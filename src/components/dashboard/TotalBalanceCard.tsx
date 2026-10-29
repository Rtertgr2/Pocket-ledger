import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import { formatBaht } from '../../utils/money';

export function TotalBalanceCard({ totalSatang, accountCount }: { totalSatang: number; accountCount: number }) {
  const styles = useStyles();
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

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  label: { color: palette.onPrimaryMuted, fontSize: 13, fontWeight: '600' },
  amount: {
    color: palette.onPrimary,
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'] as const,
  },
  caption: { color: palette.onPrimaryMuted, fontSize: 12 },
}));
