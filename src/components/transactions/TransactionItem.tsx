import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { PressableScale } from '../common/PressableScale';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { cardShadow, radius, spacing, tint } from '../../theme';
import type { Transaction } from '../../types';
import { formatTime, transactionTitle } from '../../utils/formatters';
import { formatBaht } from '../../utils/money';

const TYPE_SIGN = { INCOME: '+', EXPENSE: '-', TRANSFER: '' } as const;
const TYPE_ICON = { INCOME: 'arrow-down', EXPENSE: 'arrow-up', TRANSFER: 'swap-horizontal' } as const;
const ACCENT_KEY = { INCOME: 'income', EXPENSE: 'expense', TRANSFER: 'transfer' } as const;
const SOFT_KEY = { INCOME: 'incomeSoft', EXPENSE: 'expenseSoft' } as const;

interface TransactionItemProps {
  transaction: Transaction;
  /** Resolved by the caller so the row never queries the database. */
  accountLabel: string;
  destinationLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

/** A row of the ledger: round tinted icon, two lines of text, signed amount on the right. */
export function TransactionItem({
  transaction,
  accountLabel,
  destinationLabel,
  onPress,
  onLongPress,
}: TransactionItemProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  const accentKey = ACCENT_KEY[transaction.type];
  const accent = palette[accentKey];
  // Income and expense have solid soft tints; transfers keep the generic alpha tint.
  const chipBackground =
    transaction.type === 'TRANSFER' ? tint(accent, 0.14) : palette[SOFT_KEY[transaction.type]];
  const subtitle =
    transaction.type === 'TRANSFER'
      ? `${accountLabel} → ${destinationLabel ?? '?'}`
      : [transaction.category ?? 'ไม่ระบุหมวด', accountLabel, formatTime(transaction.transaction_date)]
          .filter(Boolean)
          .join(' · ');

  return (
    <PressableScale
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityLabel={`${transactionTitle(transaction)} ${formatBaht(transaction.amount_satang)}`}
      accessibilityHint={onLongPress ? 'กดค้างเพื่อลบรายการ' : undefined}
      style={styles.card}
    >
      <View style={[styles.iconChip, { backgroundColor: chipBackground }]}>
        <Ionicons name={TYPE_ICON[transaction.type]} size={18} color={accent} />
      </View>
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
    </PressableScale>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    ...cardShadow,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flex: 0,
  },
  texts: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600' as const, color: palette.text },
  subtitle: { fontSize: 11, color: palette.muted },
  amounts: { alignItems: 'flex-end' as const, gap: 2 },
  amount: { fontSize: 15, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as const },
  flag: { fontSize: 10, color: palette.muted },
}));
