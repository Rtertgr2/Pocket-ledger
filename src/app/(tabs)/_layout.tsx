import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors } from '../../theme';

/** The tab bar can hand back a non-string colour; the icon font needs a concrete one. */
function iconColor(color: unknown): string {
  return typeof color === 'string' ? color : colors.muted;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ภาพรวม',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={iconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'รายการ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={iconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'ตั้งค่า',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={iconColor(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
