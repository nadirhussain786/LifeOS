import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { CalendarClock, Flag, ListChecks, Tag } from 'lucide-react-native';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AttributeRow } from '@/components/ui/attribute-row';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { GoalCategoryPicker } from '@/features/goals/components/goal-category-picker';
import { GoalDueDateField } from '@/features/goals/components/goal-due-date-field';
import { MilestoneEditor } from '@/features/goals/components/milestone-editor';
import { makeGoalFormSchema, type GoalFormValues } from '@/features/goals/schemas/goal-form-schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

type Props = {
  defaultValues: GoalFormValues;
  submitLabel: string;
  onSubmit: (values: GoalFormValues) => void;
  /** Editing hides the milestone editor — existing milestones are managed on
   * the goal's detail timeline, not re-authored through the form. */
  showMilestones?: boolean;
};

const PRIORITY_OPTIONS = [
  { value: 'low' as const, label: 'Low' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'high' as const, label: 'High' },
];

const PROGRESS_OPTIONS = [
  { value: 'percent' as const, label: 'Percent' },
  { value: 'count' as const, label: 'Number' },
  { value: 'milestones' as const, label: 'Milestones' },
];

export function GoalForm({ defaultValues, submitLabel, onSubmit, showMilestones = true }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const keyboardHeight = useKeyboardHeight();
  const schema = useMemo(() => makeGoalFormSchema(showMilestones), [showMilestones]);
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
  } = useForm<GoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const progressMode = watch('progressMode');

  const submit = handleSubmit((values) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(values);
  });

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-5 pt-3"
      contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-2">
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="What do you want to achieve?"
              placeholderTextColor={colors[scheme].mutedForeground}
              autoFocus
              multiline
              onFocus={() => (focusProgress.value = withTiming(1, { duration: 220 }))}
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

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextInput
            value={field.value ?? ''}
            onChangeText={(text) => field.onChange(text || null)}
            placeholder="Add a note or why this matters (optional)"
            placeholderTextColor={colors[scheme].mutedForeground}
            multiline
            className="min-h-12 rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
          />
        )}
      />

      <View className="rounded-2xl border border-border bg-card px-4">
        <AttributeRow icon={Tag} label="Category" isFirst>
          <Controller
            control={control}
            name="category"
            render={({ field: categoryField }) => (
              <Controller
                control={control}
                name="categoryLabel"
                render={({ field: labelField }) => (
                  <GoalCategoryPicker
                    value={categoryField.value}
                    customLabel={labelField.value}
                    onChange={categoryField.onChange}
                    onChangeLabel={labelField.onChange}
                  />
                )}
              />
            )}
          />
        </AttributeRow>

        <AttributeRow icon={Flag} label="Priority">
          <Controller
            control={control}
            name="priority"
            render={({ field }) => <Segmented options={PRIORITY_OPTIONS} value={field.value} onChange={field.onChange} />}
          />
        </AttributeRow>

        <AttributeRow icon={ListChecks} label="Track progress by">
          <View className="gap-3">
            <Controller
              control={control}
              name="progressMode"
              render={({ field }) => <Segmented options={PROGRESS_OPTIONS} value={field.value} onChange={field.onChange} />}
            />

            {progressMode === 'count' && (
              <View className="flex-row gap-2">
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
                      placeholder="Target"
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors[scheme].mutedForeground}
                      className="w-24 rounded-lg border border-border px-3 py-2 text-center text-foreground"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="unit"
                  render={({ field }) => (
                    <TextInput
                      value={field.value ?? ''}
                      onChangeText={(text) => field.onChange(text || null)}
                      placeholder="books, kg, $…"
                      placeholderTextColor={colors[scheme].mutedForeground}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-foreground"
                    />
                  )}
                />
              </View>
            )}

            {progressMode === 'milestones' &&
              (showMilestones ? (
                <Controller
                  control={control}
                  name="milestones"
                  render={({ field }) => <MilestoneEditor value={field.value} onChange={field.onChange} />}
                />
              ) : (
                <Text variant="caption">Manage milestones from the goal screen.</Text>
              ))}
          </View>
        </AttributeRow>

        <AttributeRow icon={CalendarClock} label="Target date">
          <Controller control={control} name="dueDate" render={({ field }) => <GoalDueDateField value={field.value} onChange={field.onChange} />} />
        </AttributeRow>
      </View>

      <Button label={submitLabel} onPress={submit} disabled={!isValid} size="lg" variant="accent" />
    </ScrollView>
  );
}
