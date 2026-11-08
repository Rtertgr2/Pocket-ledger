import { useEffect, useRef, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { cardShadow, radius, spacing } from '../../theme';

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
  // The amount is the one field that gets its own card, as in the mockup: 40pt figures on a
  // raised surface, so it reads as the headline of the form.
  row: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    ...cardShadow,
  },
  input: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: palette.text,
    paddingVertical: 18,
    textAlign: 'center',
    fontVariant: ['tabular-nums'] as const,
  },
}));
