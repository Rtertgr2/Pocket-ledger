import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { readThemeMode, writeThemeMode, type ThemeMode } from '../services/storage/settings';
import { palettes, type ColorScheme, type Palette } from '../theme';

interface ThemeValue {
  /** What the user chose: light, dark, or follow the phone. */
  mode: ThemeMode;
  /** What is actually rendered. */
  scheme: ColorScheme;
  palette: Palette;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Owns the app palette. The choice is read synchronously from the settings store so the first
 * frame is already correct, and `Appearance.setColorScheme` keeps native chrome (alerts, keyboard,
 * status bar) in the same scheme as the JS palette.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(() => readThemeMode());

  useEffect(() => {
    // 'auto' hands control back to the phone's setting; RN 0.88 types it as ColorSchemeOverride.
    Appearance.setColorScheme(mode === 'system' ? 'auto' : mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeThemeMode(next);
  }, []);

  const scheme: ColorScheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const value = useMemo(
    () => ({ mode, scheme, palette: palettes[scheme], setMode }),
    [mode, scheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}

/**
 * Styles are built from the palette inside render, so a scheme change re-renders every consumer.
 * Usage: `const useStyles = makeStyles((palette) => ({ ... }))` then `const styles = useStyles()`.
 */
/** Mirrors RN's own `StyleSheet.create` constraint, which is no longer exported as a type. */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T> | NamedStyles<unknown>>(
  factory: (palette: Palette) => T & NamedStyles<unknown>
) {
  return function useStyles(): T {
    const { palette } = useTheme();
    // `StyleSheet.create` is an identity function in this RN version; the constraint above is
    // what keeps typos and invalid values out, and it re-runs only when the palette changes.
    return useMemo(() => factory(palette), [palette]);
  };
}
