import { Text, View } from 'react-native';
import { PressableScale } from '../common/PressableScale';
import { makeStyles } from '../../providers/ThemeProvider';
import { cardShadow, radius, spacing, readableTextOn } from '../../theme';
import type { AccountBalance } from '../../types';
import { formatBaht } from '../../utils/money';

/**
 * An account chip from the reference mockup: coloured avatar, name, balance. Chips wrap instead
 * of scrolling sideways, so every account stays reachable without a gesture.
 */
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
  const badge = account.name.trim().slice(0, 2) || '??';
  return (
    <PressableScale
      accessibilityLabel={`${account.name} ${formatBaht(account.balance_satang)}`}
      accessibilityHint="แตะเพื่อบันทึกรายการ กดค้างเพื่อปรับยอด"
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.chip}
    >
      <View style={[styles.avatar, { backgroundColor: account.color_hex }]}>
        <Text style={[styles.avatarText, { color: readableTextOn(account.color_hex) }]}>{badge}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
          {formatBaht(account.balance_satang)}
        </Text>
        {account.is_active === 0 ? <Text style={styles.inactive}>ปิดใช้งาน</Text> : null}
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((palette) => ({
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    ...cardShadow,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: { fontSize: 12, fontWeight: '700' as const },
  texts: { gap: 1 },
  name: { fontSize: 13, lineHeight: 16, fontWeight: '500' as const, color: palette.muted },
  balance: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: palette.text,
    fontVariant: ['tabular-nums'] as const,
  },
  inactive: { fontSize: 11, color: palette.muted },
}));
