import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { spacing } from '../../theme';

/** Small heading between cards: title on the left, a hint or a link on the right. */
export function SectionHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ?? (hint ? <Text style={styles.hint}>{hint}</Text> : null)}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: 2,
  },
  title: { fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.1, color: palette.text },
  hint: { fontSize: 11, color: palette.muted, textAlign: 'right' as const },
}));
