import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Alert, Pressable, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors, habitDoneColor } from '@/constants/theme';
import type { TimelineEvent, TimelineEventType } from '@/features/timeline/types/timeline.types';

// Each module keeps the identity color it already established elsewhere in
// the app (Habits' "done" green, Notes' violet, Journal's rose) so an event's
// origin reads at a glance without needing a legend.
const TYPE_TINT: Record<TimelineEventType, string> = {
  task_completed: habitDoneColor,
  task_scheduled: '#0ea5e9',
  habit_completed: habitDoneColor,
  note_created: '#8b5cf6',
  journal_written: '#ec4899',
  water_logged: '#0ea5e9',
  calendar_event: '#0ea5e9',
};

type Props = {
  event: TimelineEvent;
  onDeleteCalendarEvent?: (sourceId: string) => void;
};

export function TimelineEventRow({ event, onDeleteCalendarEvent }: Props) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const tint = event.colorToken ?? TYPE_TINT[event.type];
  const isCalendarEvent = event.type === 'calendar_event';

  const confirmDelete = () => {
    Alert.alert('Delete event?', `"${event.title}" will be removed from your timeline.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteCalendarEvent?.(event.sourceId) },
    ]);
  };

  return (
    <Pressable
      onPress={() => router.push(event.linkHref)}
      onLongPress={isCalendarEvent && onDeleteCalendarEvent ? confirmDelete : undefined}
      className="flex-row items-center gap-3 py-2.5"
    >
      <View className="w-14 items-end pr-1">
        <Text variant="caption" className="font-sora-medium" style={{ color: colors[scheme].mutedForeground }}>
          {format(event.time, 'h:mm a')}
        </Text>
        {event.endTime && (
          <Text variant="caption" style={{ color: colors[scheme].mutedForeground }}>
            – {format(event.endTime, 'h:mm a')}
          </Text>
        )}
      </View>

      <View className="items-center">
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tint }} />
        <View className="w-px flex-1 bg-border" />
      </View>

      <View className="flex-1 gap-0.5 pb-3">
        <View className="flex-row items-center gap-1.5">
          {event.emoji && <Text className="text-sm">{event.emoji}</Text>}
          <Text className="flex-1 font-sora-medium" numberOfLines={1}>
            {event.title}
          </Text>
        </View>
        {event.subtitle && (
          <Text variant="caption" numberOfLines={1}>
            {event.subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
