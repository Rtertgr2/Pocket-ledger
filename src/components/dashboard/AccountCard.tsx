import { Pressable, StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import type { AccountBalance } from '../../types';
import { formatBaht } from '../../utils/money';

export function AccountCard({
  account,
  onPress,
  onLongPress,
}: {
  account: AccountBalance;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${account.name} ${formatBaht(account.balance_satang)}`}
      accessibilityHint="แตะเพื่อบันทึกรายการ"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={[styles.dot, { backgroundColor: account.color_hex }]} />
      <Text style={styles.name} numberOfLines={1}>
        {account.name}
      </Text>
      <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
        {formatBaht(account.balance_satang)}
      </Text>
      {account.is_active === 0 ? <Text style={styles.inactive}>ปิดใช้งาน</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    width: 170,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 14, fontWeight: '700', color: palette.text },
  balance: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  inactive: { fontSize: 11, color: palette.muted },
}));
