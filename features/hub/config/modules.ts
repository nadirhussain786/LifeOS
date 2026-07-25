import {
  Clock3,
  GlassWater,
  GraduationCap,
  Images,
  Moon,
  Music2,
  Settings,
  StickyNote,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { format } from 'date-fns';

import { moduleTints } from '@/constants/design-tokens';

/**
 * The Hub is LifeOS's "app drawer" — the bottom tab bar holds only the four
 * daily drivers (Dashboard, Tasks, Habits, Journal) plus this launcher, and
 * everything else lives here as a grid. Each entry is the single source of
 * truth for a module's identity: its accent tint, icon, and route. A module
 * flips from `status: 'soon'` to `'ready'` the moment its screens ship, which
 * is the only edit the Hub needs to surface a newly-built module.
 */
export type ModuleStatus = 'ready' | 'soon';

export type HubModule = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /** Per-module identity color — readable on both light and dark cards. */
  tint: string;
  status: ModuleStatus;
  /** Resolved lazily so date-dependent destinations (timeline) stay correct. */
  getRoute: () => string;
};

export type HubSection = {
  id: string;
  label: string;
  modules: HubModule[];
};

export const HUB_SECTIONS: HubSection[] = [
  {
    id: 'growth',
    label: 'Focus & Growth',
    modules: [
      {
        id: 'goals',
        title: 'Goals',
        subtitle: 'Ambitions & milestones',
        icon: Target,
        tint: moduleTints.goals.light,
        status: 'ready',
        getRoute: () => '/goals',
      },
      {
        id: 'study',
        title: 'Study',
        subtitle: 'Focus sessions & timer',
        icon: GraduationCap,
        tint: moduleTints.study.light,
        status: 'ready',
        getRoute: () => '/study',
      },
      {
        id: 'notes',
        title: 'Notes',
        subtitle: 'Ideas & quick capture',
        icon: StickyNote,
        tint: '#eab308',
        status: 'ready',
        getRoute: () => '/notes',
      },
      {
        id: 'timeline',
        title: 'Timeline',
        subtitle: 'Your day, hour by hour',
        icon: Clock3,
        tint: moduleTints.calendar.light,
        status: 'ready',
        getRoute: () => `/timeline/${format(new Date(), 'yyyy-MM-dd')}`,
      },
    ],
  },
  {
    id: 'wellbeing',
    label: 'Wellbeing',
    modules: [
      {
        id: 'sleep',
        title: 'Sleep',
        subtitle: 'Rest & consistency',
        icon: Moon,
        tint: moduleTints.sleep.light,
        status: 'ready',
        getRoute: () => '/sleep',
      },
      {
        id: 'water',
        title: 'Water',
        subtitle: 'Daily hydration',
        icon: GlassWater,
        tint: moduleTints.water.light,
        status: 'ready',
        getRoute: () => '/water-intake/history',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    modules: [
      {
        id: 'budget',
        title: 'Budget',
        subtitle: 'Income, spending & savings',
        icon: Wallet,
        tint: moduleTints.budget.light,
        status: 'ready',
        getRoute: () => '/budget',
      },
    ],
  },
  {
    id: 'memories',
    label: 'Memories & Media',
    modules: [
      {
        id: 'gallery',
        title: 'Progress',
        subtitle: 'Visual transformation',
        icon: Images,
        tint: '#ec4899',
        status: 'ready',
        getRoute: () => '/gallery',
      },
      {
        id: 'music',
        title: 'Music',
        subtitle: 'Your offline library',
        icon: Music2,
        tint: '#14b8a6',
        status: 'ready',
        getRoute: () => '/music',
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    modules: [
      {
        id: 'settings',
        title: 'Settings',
        subtitle: 'Appearance & security',
        icon: Settings,
        tint: '#737373',
        status: 'ready',
        getRoute: () => '/settings',
      },
    ],
  },
];
