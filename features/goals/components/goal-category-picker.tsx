import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { GOAL_CATEGORIES } from '@/features/goals/config/goal-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { GoalCategory } from '@/features/goals/types/goal.types';
import { cn } from '@/lib/utils';

type Props = {
  value: GoalCategory;
  customLabel: string | null;
  onChange: (category: GoalCategory) => void;
  onChangeLabel: (label: string | null) => void;
};

export function GoalCategoryPicker({ value, customLabel, onChange, onChangeLabel }: Props) {
  const scheme = useColorScheme() ?? 'light';

  const select = (category: GoalCategory) => {
    Haptics.selectionAsync();
    onChange(category);
  };

  return (
    <View className="gap-2.5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
        {GOAL_CATEGORIES.map((category) => {
          const selected = category.id === value;
          const Icon = category.icon;
          return (
            <Pressable
              key={category.id}
              onPress={() => select(category.id)}
              style={selected ? { backgroundColor: category.tint, borderColor: category.tint } : undefined}
              className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', !selected && 'border-border')}
            >
              <Icon size={14} color={selected ? '#ffffff' : category.tint} strokeWidth={2.2} />
              <Text className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}>{category.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {value === 'custom' && (
        <TextInput
          value={customLabel ?? ''}
          onChangeText={(text) => onChangeLabel(text || null)}
          placeholder="Name your category"
          placeholderTextColor={colors[scheme].mutedForeground}
          maxLength={30}
          className="rounded-lg border border-border px-3 py-2 text-foreground"
        />
      )}
    </View>
  );
}
