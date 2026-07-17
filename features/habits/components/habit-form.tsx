import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { Bell, CalendarClock, Ruler, Sparkles, Tag } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Switch, TextInput, useColorScheme, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AttributeRow } from '@/components/ui/attribute-row';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { HabitCategoryPicker } from '@/features/habits/components/habit-category-picker';
import { HabitTypePicker } from '@/features/habits/components/habit-type-picker';
import { SchedulePicker } from '@/features/habits/components/schedule-picker';
import { habitFormSchema, type HabitFormValues } from '@/features/habits/schemas/habit-form-schema';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

const QUANTIFIED_TYPES = new Set(['count', 'duration', 'distance', 'time']);

type Props = {
  defaultValues: HabitFormValues;
  submitLabel: string;
  onSubmit: (values: HabitFormValues) => void;
};

export function HabitForm({ defaultValues, submitLabel, onSubmit }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const keyboardHeight = useKeyboardHeight();
  const focusProgress = useSharedValue(0);
  const underlineStyle = useAnimatedStyle(() => ({
    opacity: focusProgress.value,
    transform: [{ scaleX: 0.3 + focusProgress.value * 0.7 }],
  }));

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const type = watch('type');
  const isQuantified = QUANTIFIED_TYPES.has(type);

  const submit = handleSubmit((values) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(values);
  });

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-5 pt-3"
      contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-3">
        <Controller
          control={control}
          name="emoji"
          render={({ field }) => (
            <TextInput
              value={field.value ?? ''}
              onChangeText={(text) => field.onChange(text || null)}
              placeholder="🔥"
              placeholderTextColor={colors[scheme].mutedForeground}
              maxLength={2}
              className="h-12 w-12 rounded-2xl border border-border bg-card text-center text-2xl"
            />
          )}
        />

        <View className="flex-1 gap-2">
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Name your habit"
                placeholderTextColor={colors[scheme].mutedForeground}
                autoFocus
                onFocus={() => {
                  focusProgress.value = withTiming(1, { duration: 220 });
                }}
                onBlur={() => {
                  field.onBlur();
                  focusProgress.value = withTiming(0, { duration: 220 });
                }}
                style={{ fontSize: 24, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
              />
            )}
          />
          <Animated.View className="h-[3px] w-16 rounded-full bg-accent" style={underlineStyle} />
        </View>
      </View>

      <View className="rounded-2xl border border-border bg-card px-4">
        <AttributeRow icon={Sparkles} label="Type" isFirst>
          <Controller control={control} name="type" render={({ field }) => <HabitTypePicker value={field.value} onChange={field.onChange} />} />
        </AttributeRow>

        {isQuantified && (
          <AttributeRow icon={Ruler} label="Unit & target">
            <View className="flex-row gap-2">
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={(text) => field.onChange(text || null)}
                    placeholder="glasses, min, km…"
                    placeholderTextColor={colors[scheme].mutedForeground}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-foreground"
                  />
                )}
              />
              <Controller
                control={control}
                name="targetValue"
                render={({ field }) => (
                  <TextInput
                    value={field.value ? String(field.value) : ''}
                    onChangeText={(text) => {
                      const parsed = parseFloat(text);
                      field.onChange(Number.isFinite(parsed) ? parsed : null);
                    }}
                    placeholder="Goal"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors[scheme].mutedForeground}
                    className="w-20 rounded-lg border border-border px-3 py-2 text-center text-foreground"
                  />
                )}
              />
            </View>
          </AttributeRow>
        )}

        <AttributeRow icon={CalendarClock} label="Schedule">
          <Controller
            control={control}
            name="scheduleType"
            render={({ field: typeField }) => (
              <Controller
                control={control}
                name="scheduleDays"
                render={({ field: daysField }) => (
                  <Controller
                    control={control}
                    name="scheduleIntervalDays"
                    render={({ field: intervalField }) => (
                      <SchedulePicker
                        scheduleType={typeField.value}
                        scheduleDays={daysField.value}
                        scheduleIntervalDays={intervalField.value}
                        onChangeType={typeField.onChange}
                        onChangeDays={daysField.onChange}
                        onChangeInterval={intervalField.onChange}
                      />
                    )}
                  />
                )}
              />
            )}
          />
        </AttributeRow>

        <AttributeRow icon={Tag} label="Category">
          <Controller control={control} name="categoryId" render={({ field }) => <HabitCategoryPicker value={field.value} onChange={field.onChange} />} />
        </AttributeRow>

        <AttributeRow icon={Bell} label="Reminder">
          <View className="flex-row items-center gap-3">
            <Controller
              control={control}
              name="reminderTime"
              render={({ field }) => (
                <TextInput
                  value={field.value ?? ''}
                  onChangeText={(text) => field.onChange(text || null)}
                  placeholder="20:00"
                  placeholderTextColor={colors[scheme].mutedForeground}
                  className="w-20 rounded-lg border border-border px-3 py-2 text-center text-foreground"
                />
              )}
            />
            <Controller
              control={control}
              name="reminderAdaptive"
              render={({ field }) => (
                <View className="flex-row items-center gap-2">
                  <Switch
                    value={field.value}
                    onValueChange={field.onChange}
                    trackColor={{ true: colors[scheme].accent, false: colors[scheme].border }}
                  />
                  <Text variant="muted">Adapt to my routine</Text>
                </View>
              )}
            />
          </View>
        </AttributeRow>
      </View>

      <Button label={submitLabel} onPress={submit} disabled={!isValid} size="lg" variant="accent" />
    </ScrollView>
  );
}
