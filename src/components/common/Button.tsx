import { Text, type ViewStyle } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import { PressableScale } from './PressableScale';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const styles = useStyles();
  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      toScale={0.97}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[styles.base, styles[variant], disabled ? styles.disabled : null, style]}
    >
      <Text
        style={[
          styles.label,
          variant === 'secondary' ? styles.secondaryLabel : null,
          variant === 'danger' ? styles.dangerLabel : null,
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((palette) => ({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: palette.primary },
  // The fill is nearly the page colour, so the outline (>=3:1) is what identifies the control.
  secondary: {
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  danger: { backgroundColor: palette.expense },
  disabled: { opacity: 0.45 },
  label: { color: palette.onPrimary, fontSize: 15, fontWeight: '700' },
  secondaryLabel: { color: palette.text },
  dangerLabel: { color: palette.onExpense },
}));
