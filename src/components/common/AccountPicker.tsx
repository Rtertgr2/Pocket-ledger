import { StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import type { AccountBalance } from '../../types';
import { formatBaht } from '../../utils/money';
import { PressableScale } from './PressableScale';

interface AccountPickerProps {
  label: string;
  accounts: AccountBalance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Used by the transfer form to keep the destination from being the source. */
  disabledId?: string | null;
}

/**
 * Account choice for the money-movement forms: the same pill as `Chip`, with the balance under
 * the name so the user can see what is available before picking.
 */
export function AccountPicker({
  label,
  accounts,
  selectedId,
  onSelect,
  disabledId,
}: AccountPickerProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {accounts.map((account) => {
          const disabled = account.id === disabledId;
          const selected = account.id === selectedId;
          return (
            <PressableScale
              key={account.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${account.name} ${formatBaht(account.balance_satang)}`}
              disabled={disabled}
              onPress={() => onSelect(account.id)}
              toScale={0.97}
              style={[styles.chip, selected ? styles.selected : null, disabled ? styles.disabled : null]}
            >
              <Text style={[styles.name, selected ? styles.selectedText : null]} numberOfLines={1}>
                {account.name}
              </Text>
              <Text style={[styles.balance, selected ? styles.selectedText : null]}>
                {formatBaht(account.balance_satang)}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  wrapper: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600' as const, color: palette.muted },
  chips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    gap: 1,
  },
  selected: { backgroundColor: palette.primary, borderColor: palette.primary },
  disabled: { opacity: 0.35 },
  name: { fontSize: 13, fontWeight: '700' as const, color: palette.text },
  balance: {
    fontSize: 11,
    color: palette.muted,
    fontVariant: ['tabular-nums'] as const,
  },
  selectedText: { color: palette.onPrimary, fontWeight: '700' as const },
}));
