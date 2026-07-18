import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createSleepSession,
  deleteSleepSession,
  updateSleepSession,
  updateSleepSettings,
} from '@/features/sleep/services/sleep-repository';
import { syncBedtimeReminder } from '@/features/sleep/services/sleep-reminders';
import type { CreateSleepInput, SleepSettings, UpdateSleepInput } from '@/features/sleep/types/sleep.types';

export function useSleepMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sleep'] });

  const create = useMutation({
    mutationFn: async (input: CreateSleepInput) => createSleepSession(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSleepInput }) => updateSleepSession(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteSleepSession(id),
    onSuccess: invalidate,
  });

  const saveSettings = useMutation({
    mutationFn: async (input: Partial<SleepSettings>) => {
      updateSleepSettings(input);
      await syncBedtimeReminder();
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, saveSettings };
}
