import { useQuery } from '@tanstack/react-query';

import { enrichHabitWithToday, getHabitsByIds, listRoutineHabitIds, listRoutines } from '@/features/habits/services/habits-repository';
import { toDateKey } from '@/lib/date';
import type { Habit, RoutineWithHabits } from '@/features/habits/types/habit.types';

export function useRoutines() {
  return useQuery({
    queryKey: ['habits', 'routines'],
    queryFn: async (): Promise<RoutineWithHabits[]> => {
      const todayKey = toDateKey(new Date());
      return listRoutines().map((routine) => {
        const habitIds = listRoutineHabitIds(routine.id);
        const habitsById = new Map(getHabitsByIds(habitIds).map((habit) => [habit.id, habit]));
        const orderedHabits = habitIds.map((id) => habitsById.get(id)).filter((habit): habit is Habit => !!habit);
        return { ...routine, habits: orderedHabits.map((habit) => enrichHabitWithToday(habit, todayKey)) };
      });
    },
  });
}
