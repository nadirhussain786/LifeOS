import {
  BookHeart,
  CheckSquare,
  Dumbbell,
  GlassWater,
  GraduationCap,
  Moon,
  Repeat,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import { moduleTint, type ModuleName, type ThemeName } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import type { FocusArea } from '@/features/profile/store/profile-store';

/** The life areas a user can pick during onboarding. Each carries its module
 *  identity tint so the focus grid reads in the same color language as the app,
 *  and the route its dashboard shortcut deep-links to.
 *  `module: null` = no dedicated module tint, falls back to the brand accent. */
export const FOCUS_AREAS: { id: FocusArea; label: string; icon: LucideIcon; module: ModuleName | null; route: string }[] = [
  { id: 'habits', label: 'Habits', icon: Repeat, module: 'habit', route: '/(tabs)/habits' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, module: null, route: '/(tabs)/tasks' },
  { id: 'journal', label: 'Journal', icon: BookHeart, module: 'journal', route: '/(tabs)/journal' },
  { id: 'water', label: 'Hydration', icon: GlassWater, module: 'water', route: '/water-intake/history' },
  { id: 'sleep', label: 'Sleep', icon: Moon, module: 'sleep', route: '/sleep' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, module: 'fitness', route: '/gallery' },
  { id: 'goals', label: 'Goals', icon: Target, module: 'goals', route: '/goals' },
  { id: 'budget', label: 'Budget', icon: Wallet, module: 'budget', route: '/budget' },
  { id: 'study', label: 'Study', icon: GraduationCap, module: 'study', route: '/study' },
];

/** Resolve a focus area's tint for the active theme (accent when it has none). */
export function focusTint(module: ModuleName | null, theme: ThemeName): string {
  return module ? moduleTint(module, theme) : colors[theme].accent;
}
