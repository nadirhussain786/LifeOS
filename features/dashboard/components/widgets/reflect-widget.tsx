import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BookHeart } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { WidgetCard } from '@/features/dashboard/components/widget-card';
import { useReflect } from '@/features/dashboard/hooks/use-widget-data';
import type { MoodOption, ReflectData } from '@/features/dashboard/types/dashboard.types';

const MOODS: { value: MoodOption; emoji: string }[] = [
  { value: 'great', emoji: '😄' },
  { value: 'good', emoji: '🙂' },
  { value: 'okay', emoji: '😐' },
  { value: 'low', emoji: '😕' },
  { value: 'rough', emoji: '😣' },
];

export function ReflectWidget() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'light';
  const { data, isLoading } = useReflect();

  const selectMood = (mood: MoodOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    queryClient.setQueryData<ReflectData>(['dashboard', 'reflect'], (prev) =>
      prev ? { ...prev, todaysMood: mood } : prev,
    );
  };

  return (
    <WidgetCard icon={BookHeart} title="Reflect">
      {isLoading || !data ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <View className="gap-4">
          <View className="flex-row justify-between">
            {MOODS.map((mood) => (
              <Pressable
                key={mood.value}
                onPress={() => selectMood(mood.value)}
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: data.todaysMood === mood.value ? colors[scheme].muted : 'transparent' }}
              >
                <Text className="text-2xl">{mood.emoji}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row items-center justify-between">
            <Text variant="muted">🔥 {data.journalStreak}-day journal streak</Text>
            {!data.hasWrittenToday && (
              <Button label="Write" size="sm" variant="secondary" onPress={() => router.push('/(tabs)/journal')} />
            )}
          </View>
        </View>
      )}
    </WidgetCard>
  );
}
