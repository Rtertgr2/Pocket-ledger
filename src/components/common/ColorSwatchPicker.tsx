import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { ACCOUNT_COLORS, readableTextOn } from '../../theme';
import { PressableScale } from './PressableScale';

/**
 * Account colour choice. The selected swatch carries a tick as well as a ring, so the choice is
 * not communicated by colour alone.
 */
export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="สีการ์ด">
      {ACCOUNT_COLORS.map((option) => {
        const selected = option === value;
        return (
          <PressableScale
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={`สี ${option}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            toScale={0.92}
            style={[styles.swatch, selected ? styles.swatchSelected : null]}
          >
            <View style={[styles.fill, { backgroundColor: option }]}>
              {selected ? (
                <Ionicons name="checkmark" size={18} color={readableTextOn(option)} />
              ) : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  row: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  // The 44pt tap target includes the 2pt selection ring, so the visible dot stays 40pt.
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  swatchSelected: { borderColor: palette.text },
  fill: {
    flex: 1,
    alignSelf: 'stretch' as const,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
}));
