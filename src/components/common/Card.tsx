import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { makeStyles } from '../../providers/ThemeProvider';
import { cardShadow, radius, spacing } from '../../theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

const useStyles = makeStyles((palette) => ({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...cardShadow,
  },
}));
