import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { BookOpen, CheckSquare, Home, LayoutGrid, Repeat, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Per-route identity for the custom bar. Keys match the tab route file names. */
const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Home', icon: Home },
  tasks: { label: 'Tasks', icon: CheckSquare },
  habits: { label: 'Habits', icon: Repeat },
  journal: { label: 'Journal', icon: BookOpen },
  hub: { label: 'More', icon: LayoutGrid },
};

/**
 * A docked, full-width bottom tab bar — each tab shows its icon with the name
 * beneath it (all tabs always labelled), and the active tab is tinted in the
 * brand accent. It sits in the normal layout (not floating) so the navigator
 * reserves its height and insets every screen automatically — content never
 * hides behind it.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];
  const accent = theme.accent;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.card,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {state.routes.map((route, index) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const Icon = meta.icon;
        const color = focused ? accent : theme.mutedForeground;

        const onPress = () => {
          Haptics.selectionAsync();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 2 }}
          >
            <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            <Text style={{ color, fontSize: 10.5, fontFamily: focused ? 'Sora_700Bold' : 'Sora_500Medium' }}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
