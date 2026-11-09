import { ScrollView, Text } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';
import { formatBaht, formatSatang } from '../../utils/money';
import type { QuickPreset } from '../../utils/preset';
import { PressableScale } from '../common/PressableScale';

interface QuickPresetsProps {
  presets: QuickPreset[];
  onApply: (preset: QuickPreset) => void;
}

/**
 * The Quick Vault row: one tap fills the form, it never saves on its own — a stray tap on a
 * preset should not quietly add an expense the user did not confirm.
 */
export function QuickPresets({ presets, onApply }: QuickPresetsProps) {
  const styles = useStyles();
  if (presets.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {presets.map((preset) => (
        <PressableScale
          key={preset.id}
          accessibilityRole="button"
          accessibilityLabel={`${preset.label} ${formatSatang(preset.amount_satang)} บาท`}
          accessibilityHint="เติมข้อมูลลงในฟอร์ม"
          onPress={() => onApply(preset)}
          toScale={0.96}
          style={styles.chip}
        >
          <Text style={styles.label} numberOfLines={1}>
            {preset.label}
          </Text>
          <Text style={styles.amount}>{formatBaht(preset.amount_satang)}</Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((palette) => ({
  row: { flexDirection: 'row' as const, gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
    maxWidth: 180,
  },
  label: { fontSize: 13, fontWeight: '700' as const, color: palette.text },
  amount: {
    fontSize: 12,
    color: palette.muted,
    fontVariant: ['tabular-nums'] as const,
  },
}));
