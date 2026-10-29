import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../../providers/ThemeProvider';
import { spacing } from '../../theme';

/** Every screen sits on the same background and respects the top/bottom insets. */
export function Screen({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        padded ? styles.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  root: { flex: 1, backgroundColor: palette.bg },
  padded: { paddingHorizontal: spacing.lg },
}));
