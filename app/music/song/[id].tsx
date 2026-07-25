import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { MUSIC_TINT } from '@/features/music/components/song-row';
import { formatDuration } from '@/features/music/utils/format-duration';
import { useSongMutations, useSongs } from '@/features/music/hooks/use-songs';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AUTOSAVE_DELAY_MS = 500;

export default function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const { data: songs = [] } = useSongs();
  const song = songs.find((item) => item.id === id) ?? null;
  const { update, remove } = useSongMutations();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist ?? '');
    }
  }, [song?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!song || title === song.title || !title.trim()) return;
    const timeout = setTimeout(() => update.mutate({ id: song.id, input: { title: title.trim() } }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!song || artist === (song.artist ?? '')) return;
    const timeout = setTimeout(() => update.mutate({ id: song.id, input: { artist: artist.trim() || null } }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [artist]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!song) return null;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        eyebrow="Song"
        tint={MUSIC_TINT}
        actions={[
          {
            icon: Trash2,
            label: 'Delete song',
            onPress: () => {
              remove.mutate(song.id);
              router.back();
            },
            tint: colors[scheme].destructive,
          },
        ]}
      />

      <View className="gap-5 px-5 pt-2">
        <View className="gap-1.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors[scheme].mutedForeground}
            style={{ fontSize: 22, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
          />
        </View>

        <View className="gap-1.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Artist
          </Text>
          <TextInput
            value={artist}
            onChangeText={setArtist}
            placeholder="Unknown artist"
            placeholderTextColor={colors[scheme].mutedForeground}
            className="text-lg text-foreground"
          />
        </View>

        <Text variant="muted">Duration: {formatDuration(song.durationMs)}</Text>
      </View>
    </View>
  );
}
