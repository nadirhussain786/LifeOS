import { useRouter } from 'expo-router';
import { ChevronLeft, Minus, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { categoryColorPalette, colors } from '@/constants/theme';
import { formatStudyDuration } from '@/features/study/services/study-stats';
import { useStudyMutations } from '@/features/study/hooks/use-study-mutations';
import { useStudySettings, useStudySubjects } from '@/features/study/hooks/use-study';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STUDY_TINT = '#8b5cf6';

type StepperProps = {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
};

function Stepper({ label, value, onDecrease, onIncrease }: StepperProps) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
      <Text className="font-sora-medium text-foreground">{label}</Text>
      <View className="flex-row items-center gap-4">
        <Pressable onPress={onDecrease} hitSlop={6} className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
          <Minus size={16} color={colors[scheme].foreground} />
        </Pressable>
        <Text className="font-sora-bold text-foreground" style={{ minWidth: 64, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable onPress={onIncrease} hitSlop={6} className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: STUDY_TINT }}>
          <Plus size={16} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

export default function StudySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { data: settings } = useStudySettings();
  const { data: subjects = [] } = useStudySubjects();
  const { saveSettings, addSubject, removeSubject } = useStudyMutations();

  const [goal, setGoal] = useState(settings?.dailyGoalMinutes ?? 120);
  const [focus, setFocus] = useState(settings?.focusMinutes ?? 25);
  const [brk, setBrk] = useState(settings?.breakMinutes ?? 5);
  const [seeded, setSeeded] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  if (settings && !seeded) {
    setGoal(settings.dailyGoalMinutes);
    setFocus(settings.focusMinutes);
    setBrk(settings.breakMinutes);
    setSeeded(true);
  }

  const save = () => {
    saveSettings.mutate({ dailyGoalMinutes: goal, focusMinutes: focus, breakMinutes: brk });
    router.back();
  };

  const addNewSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    addSubject.mutate({ name: trimmed, colorToken: categoryColorPalette[subjects.length % categoryColorPalette.length] });
    setNewSubject('');
  };

  const confirmRemove = (id: string, name: string) => {
    Alert.alert('Delete subject?', `"${name}" will no longer be selectable. Past sessions keep their time.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeSubject.mutate(id) },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-1 px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
          <ChevronLeft size={24} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="heading">Study Settings</Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Goals & timer
          </Text>
          <Stepper
            label="Daily goal"
            value={formatStudyDuration(goal * 60)}
            onDecrease={() => setGoal((g) => Math.max(15, g - 15))}
            onIncrease={() => setGoal((g) => Math.min(600, g + 15))}
          />
          <Stepper
            label="Focus length"
            value={`${focus}m`}
            onDecrease={() => setFocus((f) => Math.max(5, f - 5))}
            onIncrease={() => setFocus((f) => Math.min(90, f + 5))}
          />
          <Stepper
            label="Break length"
            value={`${brk}m`}
            onDecrease={() => setBrk((b) => Math.max(1, b - 1))}
            onIncrease={() => setBrk((b) => Math.min(30, b + 1))}
          />
        </View>

        <View className="gap-3">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Subjects
          </Text>
          {subjects.map((subject) => (
            <View key={subject.id} className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.colorToken }} />
              <Text className="flex-1 font-sora-medium text-foreground">{subject.name}</Text>
              <Pressable onPress={() => confirmRemove(subject.id, subject.name)} hitSlop={8}>
                <Trash2 size={17} color={colors[scheme].mutedForeground} />
              </Pressable>
            </View>
          ))}
          <View className="flex-row items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-2.5">
            <TextInput
              value={newSubject}
              onChangeText={setNewSubject}
              placeholder="Add a subject"
              placeholderTextColor={colors[scheme].mutedForeground}
              onSubmitEditing={addNewSubject}
              returnKeyType="done"
              className="flex-1 text-foreground"
            />
            <Pressable onPress={addNewSubject} hitSlop={8}>
              <Plus size={18} color={STUDY_TINT} />
            </Pressable>
          </View>
        </View>

        <Button label="Save settings" onPress={save} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
