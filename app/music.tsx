import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ChevronLeft, ListMusic, Play, Plus, Shuffle } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useNowPlaying } from '@/features/music/hooks/use-player';
import { usePlaylists } from '@/features/music/hooks/use-playlists';
import { useSongMutations, useSongs } from '@/features/music/hooks/use-songs';
import { MUSIC_TINT, SongRow } from '@/features/music/components/song-row';
import { PlaylistTile } from '@/features/music/components/playlist-tile';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MusicScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const { data: songs = [], isLoading } = useSongs();
  const { data: playlists = [] } = usePlaylists();
  const { importFromDevice, remove } = useSongMutations();
  const { currentSong, isPlaying, playQueue, shuffleAll } = useNowPlaying();

  const handleAddSongs = () => importFromDevice.mutate();

  const totalMs = songs.reduce((sum, song) => sum + (song.durationMs ?? 0), 0);
  const totalMin = Math.round(totalMs / 60000);
  const totalLabel = totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : `${totalMin}m`;

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-4 pb-2">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors[scheme].foreground} />
          </Pressable>
          <Text variant="heading">Music</Text>
        </View>
        <Pressable
          onPress={handleAddSongs}
          disabled={importFromDevice.isPending}
          className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ backgroundColor: MUSIC_TINT, opacity: importFromDevice.isPending ? 0.6 : 1 }}
        >
          <Plus size={15} color="#ffffff" />
          <Text variant="caption" className="font-sora-semibold" style={{ color: '#ffffff' }}>
            {importFromDevice.isPending ? 'Adding…' : 'Add songs'}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="gap-2.5 px-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ) : songs.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No songs yet"
          description="Add songs from your device to build your library."
          actionLabel="Add songs"
          onAction={handleAddSongs}
          tint={MUSIC_TINT}
        />
      ) : (
        <FlashList
          data={songs}
          keyExtractor={(song) => song.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 160 }}
          ListHeaderComponent={
            <View className="gap-2 pb-2">
              {/* Play / shuffle all + library stats */}
              <View className="gap-2.5 px-4 pb-3 pt-1">
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => playQueue(songs, 0)}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-full py-3"
                    style={{ backgroundColor: MUSIC_TINT }}
                  >
                    <Play size={17} color="#ffffff" fill="#ffffff" />
                    <Text className="font-sora-bold" style={{ color: '#ffffff' }}>
                      Play all
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => shuffleAll(songs)}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-full border py-3"
                    style={{ borderColor: MUSIC_TINT }}
                  >
                    <Shuffle size={17} color={MUSIC_TINT} />
                    <Text className="font-sora-bold" style={{ color: MUSIC_TINT }}>
                      Shuffle
                    </Text>
                  </Pressable>
                </View>
                <Text variant="caption" className="px-1">
                  {songs.length} {songs.length === 1 ? 'song' : 'songs'} · {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'} · {totalLabel}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-4">
                <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                  Playlists
                </Text>
                <Pressable onPress={() => router.push('/music/playlist/new')} hitSlop={8}>
                  <Text variant="caption" className="font-sora-semibold" style={{ color: MUSIC_TINT }}>
                    New Playlist
                  </Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4 pb-4">
                {playlists.length === 0 ? (
                  <Pressable
                    onPress={() => router.push('/music/playlist/new')}
                    className="h-36 w-36 items-center justify-center gap-1 rounded-2xl border border-dashed border-border"
                  >
                    <Plus size={18} color={colors[scheme].mutedForeground} />
                    <Text variant="caption">New playlist</Text>
                  </Pressable>
                ) : (
                  playlists.map((playlist) => (
                    <PlaylistTile key={playlist.id} playlist={playlist} onPress={() => router.push(`/music/playlist/${playlist.id}`)} />
                  ))
                )}
              </ScrollView>

              <Text variant="caption" className="px-4 font-sora-semibold uppercase tracking-wide">
                All Songs
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              isActive={currentSong?.id === item.id}
              isPlaying={isPlaying}
              onPress={() => playQueue(songs, index)}
              onLongPress={() => router.push(`/music/song/${item.id}`)}
              onDelete={() => remove.mutate(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}
