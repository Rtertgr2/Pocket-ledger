import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { AppTabBar } from '../../components/nav/AppTabBar';
import { useTheme } from '../../providers/ThemeProvider';

/** The tab bar can hand back a non-string colour; the icon font needs a concrete one. */
function iconColor(color: unknown, fallback: string): string {
  return typeof color === 'string' ? color : fallback;
}

export default function TabsLayout() {
  const { palette } = useTheme();
  return (
    <Tabs
      // One bar for all tabs: four tabs plus the raised "+" in the centre.
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primaryText,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ภาพรวม',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={iconColor(color, palette.muted)} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'รายการ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={iconColor(color, palette.muted)} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'รายงาน',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={iconColor(color, palette.muted)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'ตั้งค่า',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={iconColor(color, palette.muted)} />
          ),
        }}
      />
    </Tabs>
  );
}
