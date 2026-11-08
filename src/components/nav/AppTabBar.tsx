import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { makeStyles, useTheme } from '../../providers/ThemeProvider';
import { radius } from '../../theme';
import { PressableScale } from '../common/PressableScale';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The props React Navigation hands a `tabBar`, taken from the component so it cannot drift. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, { active: IconName; idle: IconName }> = {
  index: { active: 'wallet', idle: 'wallet-outline' },
  transactions: { active: 'list', idle: 'list-outline' },
  reports: { active: 'bar-chart', idle: 'bar-chart-outline' },
  settings: { active: 'settings', idle: 'settings-outline' },
};

/**
 * Four tabs plus the raised "+" in the middle, matching the mockup. The centre button is not a
 * route: it opens the add screen as a modal, so the tab history stays where the user left it.
 */
export function AppTabBar({ state, descriptors, navigateToTab, insets }: TabBarProps) {
  const styles = useStyles();
  const { palette } = useTheme();

  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const label = typeof options.title === 'string' ? options.title : route.name;
    const icons = ICONS[route.name] ?? {
      active: 'ellipse' as IconName,
      idle: 'ellipse-outline' as IconName,
    };

    return (
      <PressableScale
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        toScale={0.94}
        style={styles.item}
      >
        <Ionicons
          name={focused ? icons.active : icons.idle}
          size={22}
          color={focused ? palette.primaryText : palette.muted}
        />
        <Text style={[styles.label, focused ? styles.labelActive : null]} numberOfLines={1}>
          {label}
        </Text>
      </PressableScale>
    );
  });

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {items.slice(0, 2)}
      <View style={styles.addSlot}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="บันทึกรายการ"
          onPress={() => router.push('/add')}
          toScale={0.92}
          style={styles.addButton}
        >
          <Ionicons name="add" size={26} color={palette.onNavAdd} />
        </PressableScale>
      </View>
      {items.slice(2)}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  bar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    paddingVertical: 6,
    minHeight: 52,
  },
  label: { fontSize: 10.5, color: palette.muted },
  labelActive: { color: palette.primaryText, fontWeight: '700' as const },
  // The centre slot is a fifth column, so the four tabs stay evenly spaced around it.
  addSlot: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 5,
    borderColor: palette.surface,
    backgroundColor: palette.navAdd,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    transform: [{ translateY: -15 }],
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
}));
