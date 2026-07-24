import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ListMusic, Play, Plus, Shuffle } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { ArtworkOrb } from '@/features/music/components/artwork-orb';
import { Equalizer } from '@/features/music/components/equalizer';
import { useNowPlaying } from '@/features/music/hooks/use-player';
import { usePlaylists } from '@/features/music/hooks/use-playlists';
import { useSongMutations, useSongs } from '@/features/music/hooks/use-songs';
import { MUSIC_TINT, SongRow } from '@/features/music/components/song-row';
import { PlaylistTile } from '@/features/music/components/playlist-tile';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha, tintGradient } from '@/lib/color';

export default function MusicScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const { data: songs = [], isLoading } = useSongs();
  const { data: playlists = [] } = usePlaylists();
  const { importFromDevice, remove } = useSongMutations();
  const { currentSong, isPlaying, playQueue, shuffleAll } = useNowPlaying();

  const handleAddSongs = () => importFromDevice.mutate();

  const totalMs = songs.reduce((sum, song) => sum + (song.durationMs ?? 0), 0);
  const totalMin = Math.round(totalMs / 60000);
  const totalLabel = totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : `${totalMin}m`;
  const [pg1, pg2] = tintGradient(MUSIC_TINT);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Music"
        eyebrow="Library"
        tint={MUSIC_TINT}
        right={
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
        }
      />

      {isLoading ? (
        <View className="gap-2.5 px-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
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
            <View className="gap-4 pb-2">
              {/* Now playing banner */}
              {currentSong && (
                <Pressable
                  onPress={() => router.push('/music/now-playing')}
                  className="mx-4 mt-1 flex-row items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3"
                  style={{ borderColor: alpha(MUSIC_TINT, 0.4) }}
                >
                  <ArtworkOrb seed={currentSong.id} size={46} playing={isPlaying} />
                  <View className="flex-1">
                    <Text variant="caption" className="font-sora-semibold uppercase tracking-wide" style={{ color: MUSIC_TINT }}>
                      Now Playing
                    </Text>
                    <Text className="font-sora-semibold text-foreground" numberOfLines={1}>
                      {currentSong.title}
                    </Text>
                  </View>
                  <Equalizer size={18} playing={isPlaying} color={MUSIC_TINT} />
                </Pressable>
              )}

              {/* Play all / Shuffle */}
              <View className="mx-4 flex-row gap-3">
                <Pressable onPress={() => playQueue(songs, 0)} className="flex-1 overflow-hidden rounded-full">
                  <LinearGradient colors={[pg1, pg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}>
                    <Play size={17} color="#ffffff" fill="#ffffff" />
                    <Text className="font-sora-bold" style={{ color: '#ffffff' }}>
                      Play all
                    </Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => shuffleAll(songs)}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-full border py-3.5"
                  style={{ borderColor: MUSIC_TINT }}
                >
                  <Shuffle size={17} color={MUSIC_TINT} />
                  <Text className="font-sora-bold" style={{ color: MUSIC_TINT }}>
                    Shuffle
                  </Text>
                </Pressable>
              </View>

              <Text variant="caption" className="px-5">
                {songs.length} {songs.length === 1 ? 'song' : 'songs'} · {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'} · {totalLabel}
              </Text>

              {/* Playlists */}
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between px-4">
                  <Text variant="subheading">Playlists</Text>
                  <Pressable onPress={() => router.push('/music/playlist/new')} hitSlop={8}>
                    <Text variant="caption" className="font-sora-semibold" style={{ color: MUSIC_TINT }}>
                      New playlist
                    </Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4 pb-1">
                  {playlists.length === 0 ? (
                    <Pressable
                      onPress={() => router.push('/music/playlist/new')}
                      className="h-40 w-40 items-center justify-center gap-1.5 rounded-3xl border border-dashed border-border"
                    >
                      <Plus size={20} color={colors[scheme].mutedForeground} />
                      <Text variant="caption">New playlist</Text>
                    </Pressable>
                  ) : (
                    playlists.map((playlist) => (
                      <PlaylistTile key={playlist.id} playlist={playlist} onPress={() => router.push(`/music/playlist/${playlist.id}`)} />
                    ))
                  )}
                </ScrollView>
              </View>

              <Text variant="subheading" className="px-4 pt-1">
                All songs
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
