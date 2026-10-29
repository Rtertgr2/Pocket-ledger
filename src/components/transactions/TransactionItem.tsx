import { Pressable, Text, View } from 'react-native';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { spacing } from '../../theme';
import type { Transaction } from '../../types';
import { formatTime, transactionTitle } from '../../utils/formatters';
import { formatBaht } from '../../utils/money';

const TYPE_SIGN = { INCOME: '+', EXPENSE: '-', TRANSFER: '' } as const;

interface TransactionItemProps {
  transaction: Transaction;
  /** Resolved by the caller so the row never queries the database. */
  accountLabel: string;
  destinationLabel?: string;
  onLongPress?: () => void;
}

export function TransactionItem({
  transaction,
  accountLabel,
  destinationLabel,
  onLongPress,
}: TransactionItemProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  const accent = { color: palette[ACCENT_KEY[transaction.type]] };
  const accentBar = { backgroundColor: palette[ACCENT_KEY[transaction.type]] };
  const subtitle =
    transaction.type === 'TRANSFER'
      ? `${accountLabel} → ${destinationLabel ?? '?'}`
      : `${accountLabel} · ${formatTime(transaction.transaction_date)}`;

  return (
    <Pressable
      disabled={!onLongPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityHint={onLongPress ? 'กดค้างเพื่อลบรายการ' : undefined}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={[styles.icon, accentBar]} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {transactionTitle(transaction)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.amount, accent]} numberOfLines={1}>
          {TYPE_SIGN[transaction.type]}
          {formatBaht(transaction.amount_satang)}
        </Text>
        {transaction.is_excluded_from_average === 1 && transaction.type !== 'TRANSFER' ? (
          <Text style={styles.flag}>ไม่นับค่าเฉลี่ย</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const ACCENT_KEY = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

const useStyles = makeStyles((palette) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.6 },
  icon: { width: 6, height: 32, borderRadius: 3 },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600' as const, color: palette.text },
  subtitle: { fontSize: 12, color: palette.muted },
  amounts: { alignItems: 'flex-end' as const, gap: 2 },
  amount: { fontSize: 15, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as const },
  flag: { fontSize: 10, color: palette.muted },
}));
