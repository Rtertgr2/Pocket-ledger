import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { cardShadow, radius, spacing } from '../../theme';
import { PressableScale } from './PressableScale';

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

/**
 * Track + raised pill, matching the mockup's segmented control. The selected pill sits on the
 * `surface` tone, so it reads as raised in light mode and as the lighter chip in dark mode.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (key: T) => void;
  label?: string;
}) {
  const styles = useStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <PressableScale
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            toScale={0.98}
            style={[styles.item, selected ? styles.itemSelected : null]}
          >
            <Text numberOfLines={1} style={[styles.label, selected ? styles.labelSelected : null]}>
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  track: {
    flexDirection: 'row' as const,
    backgroundColor: palette.tile,
    borderRadius: radius.md - 4,
    padding: 3,
    gap: 2,
  },
  item: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemSelected: {
    backgroundColor: palette.surface,
    ...cardShadow,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: '600' as const, color: palette.muted, textAlign: 'center' as const },
  labelSelected: { color: palette.text },
}));
