import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../../providers/ThemeProvider';
import { radius, spacing } from '../../theme';

type ToastTone = 'success' | 'error';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastContextValue {
  /** `action` turns the toast into a short-lived offer (e.g. undo) that stays for 5 seconds. */
  showToast: (message: string, tone?: ToastTone, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2200;
/** Longer, because a message with a button is something the user has to read and decide on. */
const ACTION_VISIBLE_MS = 5000;

/**
 * A single in-app toast. Android's ToastAndroid is not cross-platform and an alert would block
 * the next entry, so the message is a small animated view. It never intercepts touches unless it
 * carries an action, so a plain confirmation cannot swallow a tap on the ledger behind it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
    action?: ToastAction;
  } | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setToast(null);
      }
    );
  }, [opacity]);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success', action?: ToastAction) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone, action });
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, action ? ACTION_VISIBLE_MS : VISIBLE_MS);
    },
    [hide, opacity]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents={toast.action ? 'box-none' : 'none'}
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { opacity, bottom: insets.bottom + 72 },
            toast.tone === 'error' ? styles.error : styles.success,
          ]}
        >
          <View style={styles.row}>
            <Text style={[styles.text, toast.tone === 'error' ? styles.errorText : null]}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
                onPress={() => {
                  hide();
                  toast.action?.onPress();
                }}
                hitSlop={8}
                style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
              >
                <Text style={[styles.actionLabel, toast.tone === 'error' ? styles.errorText : null]}>
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
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
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.md,
  },
  // Inverted against the page in both schemes: one pair of colours, always readable.
  success: { backgroundColor: palette.overlayBg },
  error: { backgroundColor: palette.expense },
  errorText: { color: palette.onExpense },
  text: { flexShrink: 1, color: palette.overlayText, fontSize: 14, fontWeight: '600' as const },
  action: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.overlayText,
  },
  actionPressed: { opacity: 0.7 },
  actionLabel: {
    color: palette.overlayText,
    fontSize: 14,
    fontWeight: '800' as const,
  },
}));
