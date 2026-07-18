import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronDown, ListMusic, Moon, Music, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { QueueSheet } from '@/features/music/components/queue-sheet';
import { SleepTimerSheet } from '@/features/music/components/sleep-timer-sheet';
import { MUSIC_TINT } from '@/features/music/components/song-row';
import { useNowPlaying } from '@/features/music/hooks/use-player';
import { formatDuration } from '@/features/music/utils/format-duration';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { glowShadow, tintGradient } from '@/lib/color';
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
    queue,
    currentIndex,
    sleepTimerEndsAt,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    toggleShuffle,
    setRepeatMode,
    setSleepTimer,
    jumpToIndex,
    clearPlayer,
  } = useNowPlaying();

  const [queueOpen, setQueueOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second only while a sleep timer is armed, to drive the countdown.
  useEffect(() => {
    if (!sleepTimerEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sleepTimerEndsAt]);

  if (!currentSong) return null;

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const [g1, g2] = tintGradient(MUSIC_TINT);
  const sleepRemainingMs = sleepTimerEndsAt ? Math.max(0, sleepTimerEndsAt - now) : 0;
  const sleepActive = sleepRemainingMs > 0;
  const dismiss = () => {
    clearPlayer();
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      {/* Soft top wash in the module tint */}
      <LinearGradient
        colors={[`${MUSIC_TINT}22`, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronDown size={20} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
          {queue.length > 0 ? `${currentIndex + 1} of ${queue.length}` : 'Now Playing'}
        </Text>
        <Pressable onPress={dismiss} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted" accessibilityLabel="Stop and close">
          <X size={18} color={colors[scheme].foreground} />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center gap-7 px-8">
        <LinearGradient
          colors={[g1, g2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ height: 260, width: 260, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }, glowShadow(MUSIC_TINT, 0.4)]}
        >
          <Music size={90} color="#ffffff" strokeWidth={1.5} />
        </LinearGradient>

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

        {/* Sleep timer + Up Next */}
        <View className="w-full flex-row gap-3">
          <Pressable
            onPress={() => setSleepOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full border py-3"
            style={{ borderColor: sleepActive ? MUSIC_TINT : colors[scheme].border }}
          >
            <Moon size={16} color={sleepActive ? MUSIC_TINT : colors[scheme].mutedForeground} />
            <Text className="font-sora-semibold" style={{ color: sleepActive ? MUSIC_TINT : colors[scheme].foreground }}>
              {sleepActive ? formatDuration(sleepRemainingMs) : 'Sleep'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setQueueOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full border py-3"
            style={{ borderColor: colors[scheme].border }}
          >
            <ListMusic size={16} color={colors[scheme].foreground} />
            <Text className="font-sora-semibold text-foreground">Up Next</Text>
          </Pressable>
        </View>
      </View>

      <QueueSheet
        visible={queueOpen}
        onClose={() => setQueueOpen(false)}
        queue={queue}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        onJump={jumpToIndex}
      />
      <SleepTimerSheet visible={sleepOpen} onClose={() => setSleepOpen(false)} remainingMs={sleepRemainingMs} active={sleepActive} onSelect={setSleepTimer} />
    </View>
  );
}
