import { Stack } from 'expo-router';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting, type RouterAction } from 'expo-quick-actions/router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/common/Toast';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { initDatabase } from '../services/db/schema';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SQLiteProvider databaseName="pocket-ledger.db" onInit={initDatabase}>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </SQLiteProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Launcher shortcuts: long-press the app icon to reach the two entry screens. Registration is
 * best-effort — a launcher that refuses shortcuts (or a platform without them) must not affect
 * the ledger itself.
 */
function QuickActionsBridge() {
  useQuickActionRouting();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!(await QuickActions.isSupported())) return;
        if (cancelled) return;
        await QuickActions.setItems<RouterAction>([
          { id: 'add-expense', title: 'เพิ่มรายจ่าย', icon: 'compose', params: { href: '/add' } },
          { id: 'transfer', title: 'โอนเงิน', icon: 'share', params: { href: '/transfer' } },
        ]);
      } catch (error) {
        // A missing shortcut is a cosmetic loss; surfacing it as a crash would not be.
        console.warn('quick actions unavailable', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

/** Kept separate so the stack can read the palette: modals share one header treatment. */
function RootStack() {
  const { palette, scheme } = useTheme();
  const modalOptions = {
    presentation: 'modal' as const,
    animation: 'slide_from_bottom' as const,
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: palette.bg },
    headerTintColor: palette.primaryText,
    headerTitleStyle: { color: palette.text, fontWeight: '700' as const },
  };

  return (
    <>
      <QuickActionsBridge />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ ...modalOptions, title: 'บันทึกรายการ' }} />
        <Stack.Screen name="transfer" options={{ ...modalOptions, title: 'โอนเงิน' }} />
        <Stack.Screen name="reconcile" options={{ ...modalOptions, title: 'ปรับยอดเงิน' }} />
        <Stack.Screen name="account/new" options={{ ...modalOptions, title: 'เพิ่มบัญชี' }} />
        <Stack.Screen name="account/[id]" options={{ ...modalOptions, title: 'จัดการบัญชี' }} />
      </Stack>
    </>
  );
}
