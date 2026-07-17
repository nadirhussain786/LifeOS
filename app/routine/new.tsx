import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useRoutineMutations } from '@/features/habits/hooks/use-routine-mutations';

export default function NewRoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { create } = useRoutineMutations();
  const [name, setName] = useState('');

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    create.mutate(trimmed, {
      onSuccess: (routine) => router.replace(`/routine/${routine.id}`),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          New Routine
        </Text>
        <View className="h-8 w-8" />
      </View>

      <View className="gap-6 px-5 pt-3">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Morning routine, Wind down…"
          placeholderTextColor={colors[scheme].mutedForeground}
          autoFocus
          onSubmitEditing={handleCreate}
          style={{ fontSize: 24, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />
        <Text variant="muted">You&apos;ll add habits to this routine next, in the order you want them done.</Text>
        <Button label="Create routine" onPress={handleCreate} disabled={!name.trim()} size="lg" variant="accent" />
      </View>
    </View>
  );
}
