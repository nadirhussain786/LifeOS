import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ListMusic, Play, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { MUSIC_TINT, SongRow } from '@/features/music/components/song-row';
import { useNowPlaying } from '@/features/music/hooks/use-player';
import { usePlaylist, usePlaylistMutations, usePlaylistSongs } from '@/features/music/hooks/use-playlists';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AUTOSAVE_DELAY_MS = 500;

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const { data: playlist } = usePlaylist(id);
  const { data: songs = [], isLoading } = usePlaylistSongs(id);
  const { rename, remove, removeSong } = usePlaylistMutations();
  const { currentSong, isPlaying, playQueue } = useNowPlaying();

  const [name, setName] = useState('');

  useEffect(() => {
    if (playlist) setName(playlist.name);
  }, [playlist?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playlist || name === playlist.name || !name.trim()) return;
    const timeout = setTimeout(() => rename.mutate({ id: playlist.id, name: name.trim() }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!playlist) return null;

  const handleDeletePlaylist = () => {
    Alert.alert('Delete playlist?', `"${playlist.name}" will be deleted. Your songs stay in your library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove.mutate(playlist.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full border border-border bg-surface">
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>
        <Pressable onPress={handleDeletePlaylist} hitSlop={8}>
          <Trash2 size={19} color={colors[scheme].destructive} />
        </Pressable>
      </View>

      <View className="gap-3 px-5 pt-1">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Playlist name"
          placeholderTextColor={colors[scheme].mutedForeground}
          style={{ fontSize: 26, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="flex-row items-center justify-between">
          <Text variant="muted">
            {songs.length} song{songs.length === 1 ? '' : 's'}
          </Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => router.push(`/music/playlist/${playlist.id}/add-songs`)}
              className="flex-row items-center gap-1.5"
            >
              <Plus size={15} color={MUSIC_TINT} />
              <Text variant="caption" className="font-sora-semibold" style={{ color: MUSIC_TINT }}>
                Add songs
              </Text>
            </Pressable>
            {songs.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  playQueue(songs, 0);
                }}
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ backgroundColor: MUSIC_TINT }}
              >
                <Play size={13} color="#ffffff" fill="#ffffff" />
                <Text variant="caption" className="font-sora-semibold" style={{ color: '#ffffff' }}>
                  Play all
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {!isLoading && songs.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No songs in this playlist"
          description="Add songs from your library to get started."
          actionLabel="Add songs"
          onAction={() => router.push(`/music/playlist/${playlist.id}/add-songs`)}
          tint={MUSIC_TINT}
        />
      ) : (
        <FlashList
          data={songs}
          keyExtractor={(song) => song.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 160 }}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              isActive={currentSong?.id === item.id}
              isPlaying={isPlaying}
              onPress={() => playQueue(songs, index)}
              onLongPress={() => router.push(`/music/song/${item.id}`)}
              onRemove={() => removeSong.mutate({ playlistId: playlist.id, songId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}
