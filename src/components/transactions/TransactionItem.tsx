import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Transaction } from '../../types';
import { formatBaht } from '../../utils/money';
import { formatTime, transactionTitle } from '../../utils/formatters';
import { colors, spacing, typeColor } from '../../theme';

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
  const accent = typeColor[transaction.type];
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
      <View style={[styles.icon, { backgroundColor: accent }]} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {transactionTitle(transaction)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.amount, { color: accent }]} numberOfLines={1}>
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.6 },
  icon: { width: 6, height: 32, borderRadius: 3 },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted },
  amounts: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  flag: { fontSize: 10, color: colors.muted },
});
