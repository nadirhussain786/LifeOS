import { Tabs } from 'expo-router';
import { BookOpen, CheckSquare, LayoutGrid, Repeat, Sparkles } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { colors } from '@/constants/theme';

export default function TabsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="habits"
        options={{ title: 'Habits', tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="journal"
        options={{ title: 'Journal', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="hub"
        options={{ title: 'Hub', tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }}
      />
    </Tabs>
  );
}
