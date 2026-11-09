import { Text } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius } from '../../theme';
import { PressableScale } from './PressableScale';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Wide chips (account + balance) read better left-aligned than centred. */
  align?: 'center' | 'left';
}

/**
 * The single chip used for accounts, categories and filters. Selection is carried by fill and
 * weight as well as colour, so it survives a greyscale screenshot.
 */
export function Chip({ label, selected = false, onPress, disabled, align = 'center' }: ChipProps) {
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      toScale={0.97}
      style={[
        styles.chip,
        align === 'left' ? styles.left : null,
        selected ? styles.selected : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : null]} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((palette) => ({
  chip: {
    // 44dp of touch area: the text is 13pt, so the padding alone would leave a chip below the
    // minimum a thumb can hit reliably.
    height: 44,
    justifyContent: 'center' as const,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  left: { alignItems: 'flex-start' as const },
  selected: { backgroundColor: palette.primary, borderColor: palette.primary },
  disabled: { opacity: 0.4 },
  label: { fontSize: 13, fontWeight: '500' as const, color: palette.text },
  selectedLabel: { color: palette.onPrimary, fontWeight: '700' as const },
}));
