import { CategoryPicker as GenericCategoryPicker } from '@/components/ui/category-picker';
import { categoryColorPalette } from '@/constants/theme';
import { useNoteCategories, useNoteCategoryById } from '@/features/notes/hooks/use-notes';
import { createNoteCategory, deleteNoteCategory } from '@/features/notes/services/notes-repository';

type Props = {
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

export function NoteCategoryPicker({ value, onChange }: Props) {
  const { data: categories = [], refetch } = useNoteCategories();
  const { data: selectedCategory } = useNoteCategoryById(value);

  const handleCreate = (name: string) => {
    const color = categoryColorPalette[categories.length % categoryColorPalette.length];
    const category = createNoteCategory(name, color, 'tag');
    onChange(category.id);
    refetch();
  };

  const handleDelete = (categoryId: string) => {
    deleteNoteCategory(categoryId);
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
