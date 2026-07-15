import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, useColorScheme, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { categoryColorPalette, colors } from '@/constants/theme';
import { useTaskCategories } from '@/features/tasks/hooks/use-tasks';
import { createCategory } from '@/features/tasks/services/tasks-repository';
import { cn } from '@/lib/utils';

type Props = {
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const { data: categories = [], refetch } = useTaskCategories();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');

  const select = (categoryId: string | null) => {
    Haptics.selectionAsync();
    onChange(categoryId);
  };

  const confirmNewCategory = () => {
    const trimmed = name.trim();
    if (trimmed) {
      const color = categoryColorPalette[categories.length % categoryColorPalette.length];
      const category = createCategory(trimmed, color, 'tag');
      onChange(category.id);
      refetch();
    }
    setName('');
    setIsAdding(false);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
      <Pressable
        onPress={() => select(null)}
        className={cn('rounded-full border px-3 py-1.5', value === null ? 'border-foreground bg-foreground' : 'border-border')}
      >
        <Text className={value === null ? 'text-background' : 'text-muted-foreground'}>None</Text>
      </Pressable>

      {categories.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            onPress={() => select(category.id)}
            className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', !selected && 'border-border')}
            style={selected ? { backgroundColor: category.colorToken, borderColor: category.colorToken } : undefined}
          >
            {!selected && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: category.colorToken }} />}
            <Text className={selected ? 'font-medium text-white' : 'text-muted-foreground'}>{category.name}</Text>
          </Pressable>
        );
      })}

      {isAdding ? (
        <View className="flex-row items-center gap-1.5 rounded-full border border-border px-2 py-1">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={colors[scheme].mutedForeground}
            autoFocus
            onSubmitEditing={confirmNewCategory}
            onBlur={confirmNewCategory}
            className="min-w-24 px-1 text-foreground"
          />
        </View>
      ) : (
        <Pressable onPress={() => setIsAdding(true)} className="flex-row items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5">
          <Plus size={14} color={colors[scheme].mutedForeground} />
          <Text variant="muted">New</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
