import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/common/Toast';
import { initDatabase } from '../services/db/schema';
import { colors } from '../theme';

/** Modals share one header treatment so a form never looks like a different app. */
const modalOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontWeight: '700' as const },
} as const;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="pocket-ledger.db" onInit={initDatabase}>
        <ToastProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add" options={{ ...modalOptions, title: 'บันทึกรายการ' }} />
            <Stack.Screen name="transfer" options={{ ...modalOptions, title: 'โอนเงิน' }} />
            <Stack.Screen name="reconcile" options={{ ...modalOptions, title: 'ปรับยอดเงิน' }} />
            <Stack.Screen name="account/new" options={{ ...modalOptions, title: 'เพิ่มบัญชี' }} />
          </Stack>
        </ToastProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
