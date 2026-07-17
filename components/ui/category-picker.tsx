import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

export type CategoryOption = {
  id: string;
  name: string;
  colorToken: string;
  deletedAt?: number | null;
};

type Props = {
  value: string | null;
  categories: CategoryOption[];
  /** The category currently assigned (`value`) resolved even if it's been soft-deleted and no longer in `categories`. */
  selectedCategory?: CategoryOption | null;
  onChange: (categoryId: string | null) => void;
  onCreateCategory: (name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
};

/**
 * Generic chip-row category picker shared by tasks and notes. Extracted
 * because both features need identical select/create/delete behavior —
 * only the backing repository differs, which callers wire in via props.
 */
export function CategoryPicker({
  value,
  categories,
  selectedCategory,
  onChange,
  onCreateCategory,
  onDeleteCategory,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');

  const select = (categoryId: string | null) => {
    Haptics.selectionAsync();
    onChange(categoryId);
  };

  const confirmNewCategory = () => {
    const trimmed = name.trim();
    if (trimmed) onCreateCategory(trimmed);
    setName('');
    setIsAdding(false);
  };

  const confirmDelete = (category: CategoryOption) => {
    Alert.alert('Delete category?', `"${category.name}" will no longer be selectable. Tasks or notes already using it keep it.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteCategory(category.id) },
    ]);
  };

  // The assigned category may have been soft-deleted elsewhere and dropped
  // from the active list — still render it (dimmed, no delete affordance)
  // so this task/note doesn't appear to silently lose its label.
  const isOrphanedSelection = !!selectedCategory && !categories.some((category) => category.id === selectedCategory.id);
  const displayedCategories = isOrphanedSelection ? [...categories, selectedCategory!] : categories;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2">
      <Pressable
        onPress={() => select(null)}
        className={cn('rounded-full border px-3 py-1.5', value === null ? 'border-foreground bg-foreground' : 'border-border')}
      >
        <Text className={value === null ? 'text-background' : 'text-muted-foreground'}>None</Text>
      </Pressable>

      {displayedCategories.map((category) => {
        const selected = category.id === value;
        const isDeleted = !!category.deletedAt;
        return (
          <Pressable
            key={category.id}
            onPress={() => select(category.id)}
            onLongPress={() => !isDeleted && confirmDelete(category)}
            style={[
              selected ? { backgroundColor: category.colorToken, borderColor: category.colorToken } : undefined,
              isDeleted ? { opacity: 0.5 } : undefined,
            ]}
            className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', !selected && 'border-border')}
          >
            {!selected && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: category.colorToken }} />}
            <Text className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}>{category.name}</Text>
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
