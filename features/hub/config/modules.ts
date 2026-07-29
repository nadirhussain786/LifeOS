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
  titleKey: string;
  subtitleKey: string;
  icon: LucideIcon;
  /** Per-module identity color — readable on both light and dark cards. */
  tint: string;
  status: ModuleStatus;
  /** Resolved lazily so date-dependent destinations (timeline) stay correct. */
  getRoute: () => string;
};

export type HubSection = {
  id: string;
  labelKey: string;
  modules: HubModule[];
};

export const HUB_SECTIONS: HubSection[] = [
  {
    id: 'growth',
    labelKey: 'hubSection.growth',
    modules: [
      {
        id: 'goals',
        titleKey: 'hubModule.goalsTitle',
        subtitleKey: 'hubModule.goalsSubtitle',
        icon: Target,
        tint: moduleTints.goals.light,
        status: 'ready',
        getRoute: () => '/goals',
      },
      {
        id: 'study',
        titleKey: 'hubModule.studyTitle',
        subtitleKey: 'hubModule.studySubtitle',
        icon: GraduationCap,
        tint: moduleTints.study.light,
        status: 'ready',
        getRoute: () => '/study',
      },
      {
        id: 'notes',
        titleKey: 'hubModule.notesTitle',
        subtitleKey: 'hubModule.notesSubtitle',
        icon: StickyNote,
        tint: '#eab308',
        status: 'ready',
        getRoute: () => '/notes',
      },
      {
        id: 'timeline',
        titleKey: 'hubModule.timelineTitle',
        subtitleKey: 'hubModule.timelineSubtitle',
        icon: Clock3,
        tint: moduleTints.calendar.light,
        status: 'ready',
        getRoute: () => `/timeline/${format(new Date(), 'yyyy-MM-dd')}`,
      },
    ],
  },
  {
    id: 'wellbeing',
    labelKey: 'hubSection.wellbeing',
    modules: [
      {
        id: 'sleep',
        titleKey: 'hubModule.sleepTitle',
        subtitleKey: 'hubModule.sleepSubtitle',
        icon: Moon,
        tint: moduleTints.sleep.light,
        status: 'ready',
        getRoute: () => '/sleep',
      },
      {
        id: 'water',
        titleKey: 'hubModule.waterTitle',
        subtitleKey: 'hubModule.waterSubtitle',
        icon: GlassWater,
        tint: moduleTints.water.light,
        status: 'ready',
        getRoute: () => '/water-intake/history',
      },
    ],
  },
  {
    id: 'finance',
    labelKey: 'hubSection.finance',
    modules: [
      {
        id: 'budget',
        titleKey: 'hubModule.budgetTitle',
        subtitleKey: 'hubModule.budgetSubtitle',
        icon: Wallet,
        tint: moduleTints.budget.light,
        status: 'ready',
        getRoute: () => '/budget',
      },
    ],
  },
  {
    id: 'memories',
    labelKey: 'hubSection.memories',
    modules: [
      {
        id: 'gallery',
        titleKey: 'hubModule.galleryTitle',
        subtitleKey: 'hubModule.gallerySubtitle',
        icon: Images,
        tint: moduleTints.gallery.light,
        status: 'ready',
        getRoute: () => '/gallery',
      },
      {
        id: 'music',
        titleKey: 'hubModule.musicTitle',
        subtitleKey: 'hubModule.musicSubtitle',
        icon: Music2,
        tint: '#14b8a6',
        status: 'ready',
        getRoute: () => '/music',
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'hubSection.system',
    modules: [
      {
        id: 'settings',
        titleKey: 'hubModule.settingsTitle',
        subtitleKey: 'hubModule.settingsSubtitle',
        icon: Settings,
        tint: '#737373',
        status: 'ready',
        getRoute: () => '/settings',
      },
    ],
  },
];
