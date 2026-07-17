import { useRouter } from 'expo-router';
import { Pause, Play, SkipForward } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { MUSIC_TINT } from '@/features/music/components/song-row';
import { useNowPlaying } from '@/features/music/hooks/use-player';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Approximates the default React Navigation bottom-tab-bar height so the
// bar floats just above it — the tab navigator itself doesn't expose this
// height to a sibling outside its own screens (only to descendants, via
// useBottomTabBarHeight()), so a plain platform-based constant stands in.
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

/** Persistent "now playing" strip shown above the tab bar whenever a song is
 * loaded — mounted once in app/(tabs)/_layout.tsx so it survives tab
 * switches. Tapping it opens the full Now Playing screen. */
export function MiniPlayerBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { currentSong, isPlaying, positionMs, durationMs, togglePlayPause, playNext } = useNowPlaying();

  if (!currentSong) return null;

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <Pressable
      onPress={() => router.push('/music/now-playing')}
      style={{ position: 'absolute', left: 12, right: 12, bottom: TAB_BAR_HEIGHT + insets.bottom + 8 }}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <View className="h-[2px] w-full bg-muted">
        <View className="h-full" style={{ width: `${progress * 100}%`, backgroundColor: MUSIC_TINT }} />
      </View>
      <View className="flex-row items-center gap-3 px-3 py-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${MUSIC_TINT}22` }}>
          <Text className="text-base">🎵</Text>
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-sora-medium" numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {currentSong.artist ?? 'Unknown artist'}
          </Text>
        </View>
        <Pressable onPress={togglePlayPause} hitSlop={8} className="h-8 w-8 items-center justify-center">
          {isPlaying ? (
            <Pause size={20} color={colors[scheme].foreground} fill={colors[scheme].foreground} />
          ) : (
            <Play size={20} color={colors[scheme].foreground} fill={colors[scheme].foreground} />
          )}
        </Pressable>
        <Pressable onPress={playNext} hitSlop={8} className="h-8 w-8 items-center justify-center">
          <SkipForward size={18} color={colors[scheme].foreground} fill={colors[scheme].foreground} />
        </Pressable>
      </View>
    </Pressable>
  );
}
