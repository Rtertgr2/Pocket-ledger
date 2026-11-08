import { Text, View } from 'react-native';
import { PressableScale } from '../common/PressableScale';
import { makeStyles } from '../../providers/ThemeProvider';
import { readableTextOn, spacing } from '../../theme';
import type { AccountBalance } from '../../types';
import { formatBaht } from '../../utils/money';

/** One account inside the "บัญชีของฉัน" card: coloured badge, name, balance. */
export function AccountRow({
  account,
  onPress,
  onLongPress,
}: {
  account: AccountBalance;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const styles = useStyles();
  const badge = account.name.trim().slice(0, 2) || '??';

  return (
    <PressableScale
      accessibilityLabel={`${account.name} ${formatBaht(account.balance_satang)}`}
      accessibilityHint="แตะเพื่อบันทึกรายการเข้าบัญชีนี้ กดค้างเพื่อปรับยอด"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={styles.row}
    >
      <View style={[styles.avatar, { backgroundColor: account.color_hex }]}>
        <Text style={[styles.avatarText, { color: readableTextOn(account.color_hex) }]}>{badge}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.sub}>{account.is_active === 1 ? 'ยอดคงเหลือ' : 'ปิดใช้งาน'}</Text>
      </View>
      <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
        {formatBaht(account.balance_satang)}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((palette) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingVertical: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flex: 0,
  },
  avatarText: { fontSize: 12, fontWeight: '700' as const },
  info: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, fontWeight: '600' as const, color: palette.text },
  sub: { fontSize: 11, color: palette.muted },
  // Balances can be long; they keep their tabular figures and shrink before overflowing.
  balance: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
    maxWidth: '48%',
    textAlign: 'right' as const,
  },
}));
