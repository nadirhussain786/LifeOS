import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { ChevronDown, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { MUSIC_TINT } from '@/features/music/components/song-row';
import { useNowPlaying } from '@/features/music/hooks/use-player';
import { formatDuration } from '@/features/music/utils/format-duration';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RepeatMode } from '@/features/music/types/music.types';

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };

export default function NowPlayingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const {
    currentSong,
    isPlaying,
    positionMs,
    durationMs,
    shuffle,
    repeatMode,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    toggleShuffle,
    setRepeatMode,
  } = useNowPlaying();

  if (!currentSong) return null;

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronDown size={20} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          Now Playing
        </Text>
        <View className="h-8 w-8" />
      </View>

      <View className="flex-1 items-center justify-center gap-8 px-8">
        <View
          className="h-64 w-64 items-center justify-center rounded-3xl"
          style={{ backgroundColor: `${MUSIC_TINT}22` }}
        >
          <Text className="text-7xl">🎵</Text>
        </View>

        <View className="w-full gap-1">
          <Text variant="heading" numberOfLines={1} className="text-center">
            {currentSong.title}
          </Text>
          <Text variant="muted" numberOfLines={1} className="text-center">
            {currentSong.artist ?? 'Unknown artist'}
          </Text>
        </View>

        <View className="w-full gap-1">
          <Slider
            value={positionMs / 1000}
            minimumValue={0}
            maximumValue={Math.max(durationMs / 1000, 1)}
            minimumTrackTintColor={MUSIC_TINT}
            maximumTrackTintColor={colors[scheme].border}
            thumbTintColor={MUSIC_TINT}
            onSlidingComplete={(value) => seekTo(value)}
          />
          <View className="flex-row justify-between">
            <Text variant="caption">{formatDuration(positionMs)}</Text>
            <Text variant="caption">{formatDuration(durationMs)}</Text>
          </View>
        </View>

        <View className="w-full flex-row items-center justify-between">
          <Pressable onPress={toggleShuffle} hitSlop={10}>
            <Shuffle size={19} color={shuffle ? MUSIC_TINT : colors[scheme].mutedForeground} />
          </Pressable>

          <View className="flex-row items-center gap-8">
            <Pressable onPress={playPrevious} hitSlop={10}>
              <SkipBack size={26} color={colors[scheme].foreground} fill={colors[scheme].foreground} />
            </Pressable>
            <Pressable
              onPress={togglePlayPause}
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: MUSIC_TINT }}
            >
              {isPlaying ? (
                <Pause size={26} color="#ffffff" fill="#ffffff" />
              ) : (
                <Play size={26} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
              )}
            </Pressable>
            <Pressable onPress={playNext} hitSlop={10}>
              <SkipForward size={26} color={colors[scheme].foreground} fill={colors[scheme].foreground} />
            </Pressable>
          </View>

          <Pressable onPress={() => setRepeatMode(REPEAT_CYCLE[repeatMode])} hitSlop={10}>
            <RepeatIcon size={19} color={repeatMode === 'off' ? colors[scheme].mutedForeground : MUSIC_TINT} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
