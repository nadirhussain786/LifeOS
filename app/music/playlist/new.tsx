import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { categoryColorPalette, colors } from '@/constants/theme';
import { usePlaylistMutations } from '@/features/music/hooks/use-playlists';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewPlaylistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          New Playlist
        </Text>
        <View className="h-8 w-8" />
      </View>

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
