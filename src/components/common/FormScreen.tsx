import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../../providers/ThemeProvider';
import { spacing } from '../../theme';

/**
 * Modal bodies: scrollable fields, with the action button always reachable above the keyboard.
 * Edge-to-edge Android no longer resizes the window for the IME, so the keyboard height is
 * tracked explicitly instead of relying on `KeyboardAvoidingView`.
 */
export function FormScreen({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const bottomInset = keyboardHeight > 0 ? keyboardHeight + spacing.sm : Math.max(insets.bottom, spacing.md);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: bottomInset }]}>{footer}</View>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: palette.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
}));
