import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
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

/** Kept separate so the stack can read the palette: modals share one header treatment. */
function RootStack() {
  const { palette, scheme } = useTheme();
  const modalOptions = {
    presentation: 'modal' as const,
    animation: 'slide_from_bottom' as const,
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: palette.bg },
    headerTintColor: palette.primary,
    headerTitleStyle: { color: palette.text, fontWeight: '700' as const },
  };

  return (
    <>
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
