import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ListMusic, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { MUSIC_TINT } from '@/features/music/components/song-row';
import { usePlaylist, usePlaylistMutations, usePlaylistSongs } from '@/features/music/hooks/use-playlists';
import { useSongs } from '@/features/music/hooks/use-songs';
import { formatDuration } from '@/features/music/utils/format-duration';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AddSongsToPlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const { data: playlist } = usePlaylist(id);
  const { data: library = [] } = useSongs();
  const { data: playlistSongs = [] } = usePlaylistSongs(id);
  const { addSong, removeSong } = usePlaylistMutations();

  const memberIds = useMemo(() => new Set(playlistSongs.map((song) => song.id)), [playlistSongs]);

  if (!playlist) return null;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
          <X size={17} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          Add to {playlist.name}
        </Text>
        <View className="h-8 w-8" />
      </View>

      {library.length === 0 ? (
        <EmptyState icon={ListMusic} title="Your library is empty" description="Add songs from your device first." tint={MUSIC_TINT} />
      ) : (
        <FlashList
          data={library}
          keyExtractor={(song) => song.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const inPlaylist = memberIds.has(item.id);
            return (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  if (inPlaylist) removeSong.mutate({ playlistId: playlist.id, songId: item.id });
                  else addSong.mutate({ playlistId: playlist.id, songId: item.id });
                }}
                className="flex-row items-center gap-3 px-4 py-3"
              >
                <View
                  className="h-6 w-6 items-center justify-center rounded-full border"
                  style={{
                    borderColor: inPlaylist ? MUSIC_TINT : colors[scheme].border,
                    backgroundColor: inPlaylist ? MUSIC_TINT : 'transparent',
                  }}
                >
                  {inPlaylist && <Check size={13} color="#ffffff" />}
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="font-sora-medium" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {item.artist ?? 'Unknown artist'}
                  </Text>
                </View>
                <Text variant="caption">{formatDuration(item.durationMs)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
