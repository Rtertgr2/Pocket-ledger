import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

/** The one place money is typed: a decimal pad that always starts focused. */
export function AmountInput({ value, onChangeText, autoFocus = true, placeholder = '0.00' }: AmountInputProps) {
  const styles = useStyles();
  const { palette } = useTheme();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => ref.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <View style={styles.row}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        inputMode="decimal"
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        selectionColor={palette.primaryText}
        accessibilityLabel="จำนวนเงิน"
        style={styles.input}
      />
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  row: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    fontSize: 36,
    fontWeight: '700',
    color: palette.text,
    paddingVertical: spacing.lg,
    textAlign: 'center',
    fontVariant: ['tabular-nums'] as const,
  },
}));
