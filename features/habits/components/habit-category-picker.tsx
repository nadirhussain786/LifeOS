import { CategoryPicker as GenericCategoryPicker } from '@/components/ui/category-picker';
import { categoryColorPalette } from '@/constants/theme';
import { useHabitCategories, useHabitCategoryById } from '@/features/habits/hooks/use-habits';
import { createHabitCategory, deleteHabitCategory } from '@/features/habits/services/habits-repository';

type Props = {
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

export function HabitCategoryPicker({ value, onChange }: Props) {
  const { data: categories = [], refetch } = useHabitCategories();
  const { data: selectedCategory } = useHabitCategoryById(value);

  const handleCreate = (name: string) => {
    const color = categoryColorPalette[categories.length % categoryColorPalette.length];
    const category = createHabitCategory(name, color, 'sparkles');
    onChange(category.id);
    refetch();
  };

  const handleDelete = (categoryId: string) => {
    deleteHabitCategory(categoryId);
    refetch();
  };

  return (
    <GenericCategoryPicker
      value={value}
      categories={categories}
      selectedCategory={selectedCategory}
      onChange={onChange}
      onCreateCategory={handleCreate}
      onDeleteCategory={handleDelete}
    />
  );
}
