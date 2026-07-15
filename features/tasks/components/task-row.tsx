import { format, isToday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Archive, Check, Trash2 } from 'lucide-react-native';
import { Pressable, useColorScheme, View } from 'react-native';

import { SwipeableRow } from '@/components/ui/swipeable-row';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { getDueBucket } from '@/features/tasks/services/task-grouping';
import type { Task } from '@/features/tasks/types/task.types';

type Props = {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

function DueDateLabel({ task }: { task: Task }) {
  if (!task.dueDate) return null;
  const bucket = getDueBucket(task);
  const variant = bucket === 'overdue' ? 'text-destructive' : bucket === 'today' ? 'text-foreground' : 'text-muted-foreground';
  return (
    <Text className={`text-xs font-medium ${variant}`}>
      {isToday(task.dueDate) ? 'Today' : format(task.dueDate, 'MMM d')}
    </Text>
  );
}

function PriorityDot({ priority }: { priority: Task['priority'] }) {
  if (priority === 'none') return null;
  if (priority === 'high') return <View className="h-1.5 w-1.5 rounded-full bg-destructive" />;
  if (priority === 'medium') return <View className="h-1.5 w-1.5 rounded-full bg-foreground" />;
  return <View className="h-1.5 w-1.5 rounded-full border border-muted-foreground" />;
}

export function TaskRow({ task, onPress, onToggleComplete, onArchive, onDelete }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const isCompleted = task.status === 'completed';

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleComplete();
  };

  return (
    <SwipeableRow
      actions={
        <>
          <Pressable onPress={onArchive} className="flex-1 items-center justify-center bg-secondary">
            <Archive color={colors[scheme].foreground} size={18} />
          </Pressable>
          <Pressable onPress={onDelete} className="flex-1 items-center justify-center bg-destructive">
            <Trash2 color={colors[scheme].primaryForeground} size={18} />
          </Pressable>
        </>
      }
    >
      <Pressable onPress={onPress} className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          onPress={handleToggle}
          hitSlop={8}
          className="h-6 w-6 items-center justify-center rounded-full border"
          style={{
            borderColor: isCompleted ? colors[scheme].accent : colors[scheme].border,
            backgroundColor: isCompleted ? colors[scheme].accent : 'transparent',
          }}
        >
          {isCompleted ? <Check size={14} color={colors[scheme].accentForeground} /> : null}
        </Pressable>

        <View className="flex-1 gap-1">
          <Text className={isCompleted ? 'text-muted-foreground line-through' : ''} numberOfLines={1}>
            {task.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <PriorityDot priority={task.priority} />
            <DueDateLabel task={task} />
          </View>
        </View>
      </Pressable>
    </SwipeableRow>
  );
}
