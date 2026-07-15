import { CalendarPreviewWidget } from '@/features/dashboard/components/widgets/calendar-preview-widget';
import { DailyQuoteWidget } from '@/features/dashboard/components/widgets/daily-quote-widget';
import { HabitRowWidget } from '@/features/dashboard/components/widgets/habit-row-widget';
import { ProductivitySummaryWidget } from '@/features/dashboard/components/widgets/productivity-summary-widget';
import { RecentNotesWidget } from '@/features/dashboard/components/widgets/recent-notes-widget';
import { ReflectWidget } from '@/features/dashboard/components/widgets/reflect-widget';
import { TodayTasksWidget } from '@/features/dashboard/components/widgets/today-tasks-widget';
import { WaterIntakeWidget } from '@/features/dashboard/components/widgets/water-intake-widget';
import type { WidgetId } from '@/features/dashboard/types/dashboard.types';

export const WIDGET_REGISTRY: Record<WidgetId, React.ComponentType> = {
  'today-tasks': TodayTasksWidget,
  'habit-row': HabitRowWidget,
  'calendar-preview': CalendarPreviewWidget,
  reflect: ReflectWidget,
  'recent-notes': RecentNotesWidget,
  'water-intake': WaterIntakeWidget,
  'productivity-summary': ProductivitySummaryWidget,
  'daily-quote': DailyQuoteWidget,
};
