import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { categoryColorPalette, colors } from '@/constants/theme';
import { usePlaylistMutations } from '@/features/music/hooks/use-playlists';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewPlaylistScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { create } = usePlaylistMutations();
  const [name, setName] = useState('');
  const [colorToken, setColorToken] = useState<string>(categoryColorPalette[0]);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    create.mutate(
      { name: trimmed, colorToken },
      { onSuccess: (playlist) => router.replace(`/music/playlist/${playlist.id}`) },
    );
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title="New Playlist" />

      <View className="gap-6 px-5 pt-3">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Road trip, Focus, Workout…"
          placeholderTextColor={colors[scheme].mutedForeground}
          autoFocus
          onSubmitEditing={handleCreate}
          style={{ fontSize: 24, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="gap-2.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Color
          </Text>
          <View className="flex-row gap-2.5">
            {categoryColorPalette.map((swatch) => {
              const selected = swatch === colorToken;
              return (
                <Pressable
                  key={swatch}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setColorToken(swatch);
                  }}
                  accessibilityLabel={`Color ${swatch}`}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: swatch, borderWidth: selected ? 2 : 0, borderColor: colors[scheme].foreground }}
                />
              );
            })}
          </View>
        </View>

        <Button label="Create playlist" onPress={handleCreate} disabled={!name.trim()} size="lg" variant="accent" />
      </View>
    </View>
  );
}
