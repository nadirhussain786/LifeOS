import {
  Award,
  Dumbbell,
  GraduationCap,
  Images,
  Scale,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react-native';

import type { AlbumCategory } from '@/features/gallery/types/gallery.types';

export type AlbumCategoryMeta = {
  id: AlbumCategory;
  labelKey: string;
  icon: LucideIcon;
  tint: string;
};

export const ALBUM_CATEGORIES: AlbumCategoryMeta[] = [
  { id: 'gym', labelKey: 'albumCategory.gym', icon: Dumbbell, tint: '#ef4444' },
  { id: 'body', labelKey: 'albumCategory.body', icon: User, tint: '#f97316' },
  { id: 'weight_loss', labelKey: 'albumCategory.weight_loss', icon: Scale, tint: '#22c55e' },
  {
    id: 'certificates',
    labelKey: 'albumCategory.certificates',
    icon: GraduationCap,
    tint: '#8b5cf6',
  },
  { id: 'achievements', labelKey: 'albumCategory.achievements', icon: Award, tint: '#eab308' },
  { id: 'memories', labelKey: 'albumCategory.memories', icon: Sparkles, tint: '#ec4899' },
  { id: 'custom', labelKey: 'albumCategory.custom', icon: Images, tint: '#0ea5e9' },
];

const BY_ID = new Map(ALBUM_CATEGORIES.map((c) => [c.id, c]));

export function albumCategoryMeta(id: AlbumCategory): AlbumCategoryMeta {
  return BY_ID.get(id) ?? ALBUM_CATEGORIES[ALBUM_CATEGORIES.length - 1];
}
