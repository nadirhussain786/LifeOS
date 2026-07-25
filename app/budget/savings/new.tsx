import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { SAVINGS_COLORS } from '@/features/budget/config/budget-config';
import { formatMoney, parseAmountToCents } from '@/features/budget/services/money';
import { useBudgetMutations } from '@/features/budget/hooks/use-budget-mutations';
import { useBudgetSettings, useSavingsGoals } from '@/features/budget/hooks/use-budget';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewSavingsGoalScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { addSavingsGoal } = useBudgetMutations();
  const { data: settings } = useBudgetSettings();
  const { data: goals = [] } = useSavingsGoals();
  const currency = settings?.currency ?? '$';

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [showDate, setShowDate] = useState(false);

  const targetCents = parseAmountToCents(target);
  const canSave = name.trim().length > 0 && targetCents > 0;

  const handleDate = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (event.type === 'set' && date) setDeadline(date.getTime());
  };

  const save = () => {
    if (!canSave) return;
    const color = SAVINGS_COLORS[goals.length % SAVINGS_COLORS.length];
    addSavingsGoal.mutate({ name: name.trim(), targetCents, colorToken: color, deadline });
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title="New Savings Goal" />

      <ScrollView contentContainerClassName="gap-5 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Goal name (e.g. Emergency fund)"
          placeholderTextColor={colors[scheme].mutedForeground}
          autoFocus
          style={{ fontSize: 22, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="gap-2.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Target amount
          </Text>
          <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <Text className="font-sora-bold text-xl" style={{ color: '#22c55e' }}>
              {currency}
            </Text>
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={colors[scheme].mutedForeground}
              className="flex-1 text-foreground"
              style={{ fontSize: 20, fontFamily: 'Sora_600SemiBold' }}
            />
            {targetCents > 0 && <Text variant="caption">{formatMoney(targetCents, currency)}</Text>}
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color={colors[scheme].mutedForeground} />
            <Text className="font-sora-medium text-foreground">Deadline (optional)</Text>
          </View>
          {Platform.OS === 'ios' ? (
            <DateTimePicker value={deadline ? new Date(deadline) : new Date()} mode="date" display="compact" onChange={handleDate} />
          ) : (
            <Pressable onPress={() => setShowDate(true)} className="rounded-lg bg-muted px-3 py-1.5">
              <Text className="font-sora-semibold text-foreground">{deadline ? format(deadline, 'MMM yyyy') : 'None'}</Text>
            </Pressable>
          )}
        </View>
        {Platform.OS === 'android' && showDate && (
          <DateTimePicker value={deadline ? new Date(deadline) : new Date()} mode="date" display="default" onChange={handleDate} />
        )}

        <Button label="Create goal" onPress={save} disabled={!canSave} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
