import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

/** The one place money is typed: a decimal pad that always starts focused. */
export function AmountInput({ value, onChangeText, autoFocus = true, placeholder = '0.00' }: AmountInputProps) {
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
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        accessibilityLabel="จำนวนเงิน"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.lg,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
