import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

interface RingGaugeProps {
  /** 0..1. Clamped; below 0.1 and above 1 the ring degrades to a few lit dots. */
  progress: number;
  /** Diameter in dp. The reference mockup uses ~92; 100 keeps the centre number readable. */
  size?: number;
  dots?: number;
  label: string;
  value: string;
  caption: string;
  style?: ViewStyle;
}

/**
 * The mockup's donut, drawn without an SVG library: one dot per step around a circle, lit up to
 * `progress`. No new native dependency, and the dots are plain Views so they take the palette
 * (and therefore dark mode) for free. The centre carries the daily burn rate.
 */
export function RingGauge({
  progress,
  size = 100,
  dots = 28,
  label,
  value,
  caption,
  style,
}: RingGaugeProps) {
  const { palette } = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const lit = Math.round(clamped * dots);
  const dot = 5;
  const radius = size / 2 - dot / 2 - 1;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${label} ${Math.round(clamped * 100)}%`}
      style={[styles.wrapper, { width: size, height: size }, style]}
    >
      {Array.from({ length: dots }, (_, index) => {
        const angle = (-90 + (index * 360) / dots) * (Math.PI / 180);
        const x = size / 2 + radius * Math.cos(angle);
        const y = size / 2 + radius * Math.sin(angle);
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: x - dot / 2,
              top: y - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: index < lit ? palette.onPrimary : palette.onPrimaryMuted,
            }}
          />
        );
      })}
      <View style={styles.center} pointerEvents="none">
        <Text
          style={[styles.value, { color: palette.onPrimary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        <Text style={[styles.caption, { color: palette.onPrimaryMuted }]} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 1, paddingHorizontal: 4 },
  value: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  caption: { fontSize: 9, textAlign: 'center' },
});
