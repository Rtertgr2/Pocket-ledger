import { Pressable, StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import type { AccountBalance } from '../../types';
import { formatBaht } from '../../utils/money';

interface AccountPickerProps {
  label: string;
  accounts: AccountBalance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Used by the transfer form to keep the destination from being the source. */
  disabledId?: string | null;
}

export function AccountPicker({ label, accounts, selectedId, onSelect, disabledId }: AccountPickerProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {accounts.map((account) => {
          const disabled = account.id === disabledId;
          const selected = account.id === selectedId;
          return (
            <Pressable
              key={account.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(account.id)}
              style={[styles.chip, selected ? styles.selected : null, disabled ? styles.disabled : null]}
            >
              <Text style={[styles.name, selected ? styles.selectedText : null]}>{account.name}</Text>
              <Text style={[styles.balance, selected ? styles.selectedText : null]}>
                {formatBaht(account.balance_satang)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  wrapper: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: palette.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    gap: 2,
  },
  selected: { backgroundColor: palette.primary, borderColor: palette.primary },
  disabled: { opacity: 0.35 },
  name: { fontSize: 14, fontWeight: '700', color: palette.text },
  balance: { fontSize: 11, color: palette.muted, fontVariant: ['tabular-nums'] as const },
  selectedText: { color: palette.onPrimary },
}));
