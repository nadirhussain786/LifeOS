import { Tabs } from 'expo-router';
import { BookOpen, CheckSquare, LayoutGrid, Music2, Repeat, StickyNote } from 'lucide-react-native';
import { View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { colors } from '@/constants/theme';
import { MiniPlayerBar } from '@/features/music/components/mini-player-bar';

export default function TabsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];

  return (
    <View style={{ flex: 1 }}>
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
          name="notes"
          options={{ title: 'Notes', tabBarIcon: ({ color, size }) => <StickyNote color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="journal"
          options={{ title: 'Journal', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="habits"
          options={{ title: 'Habits', tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="music"
          options={{ title: 'Music', tabBarIcon: ({ color, size }) => <Music2 color={color} size={size} /> }}
        />
      </Tabs>
      <MiniPlayerBar />
    </View>
  );
}
