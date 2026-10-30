import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';

type ToastTone = 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2200;

/**
 * A single in-app toast. Android's ToastAndroid is not cross-platform and an alert would block
 * the next entry, so the message is a small animated view that never intercepts touches.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone });
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) setToast(null);
          }
        );
      }, VISIBLE_MS);
    },
    [opacity]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { opacity, bottom: insets.bottom + 72 },
            toast.tone === 'error' ? styles.error : styles.success,
          ]}
        >
          <Text style={[styles.text, toast.tone === 'error' ? styles.errorText : null]}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

const useStyles = makeStyles((palette) => ({
  toast: {
    position: 'absolute' as const,
    left: spacing.xl,
    right: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center' as const,
  },
  // Inverted against the page in both schemes: one pair of colours, always readable.
  success: { backgroundColor: palette.overlayBg },
  error: { backgroundColor: palette.expense },
  errorText: { color: palette.onExpense },
  text: { color: palette.overlayText, fontSize: 14, fontWeight: '600' as const },
}));
