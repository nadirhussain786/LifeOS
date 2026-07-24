import { useRouter } from 'expo-router';
import { ChevronDown, ListMusic, Moon, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { ArtworkOrb } from '@/features/music/components/artwork-orb';
import { AuroraBackground } from '@/features/music/components/aurora-background';
import { QueueSheet } from '@/features/music/components/queue-sheet';
import { SleepTimerSheet } from '@/features/music/components/sleep-timer-sheet';
import { WaveformScrubber } from '@/features/music/components/waveform-scrubber';
import { useNowPlaying } from '@/features/music/hooks/use-player';
import { songColor } from '@/features/music/utils/song-art';
import { formatDuration } from '@/features/music/utils/format-duration';
import { alpha } from '@/lib/color';
import type { RepeatMode } from '@/features/music/types/music.types';

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };
const WHITE = '#ffffff';

/** Frosted round chip used for the header + secondary actions. */
function GlassChip({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityLabel={label}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: alpha(WHITE, 0.14), borderWidth: 1, borderColor: alpha(WHITE, 0.14) }}
    >
      {children}
    </Pressable>
  );
}

export default function NowPlayingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    if (!sleepTimerEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sleepTimerEndsAt]);

  if (!currentSong) return null;

  const seed = currentSong.id;
  const accent = songColor(seed);
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const sleepRemainingMs = sleepTimerEndsAt ? Math.max(0, sleepTimerEndsAt - now) : 0;
  const sleepActive = sleepRemainingMs > 0;
  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  const dismiss = () => {
    clearPlayer();
    router.back();
  };

  return (
    <View className="flex-1">
      <AuroraBackground color={accent} />

      <View style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }} className="flex-1 px-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <GlassChip onPress={() => router.back()} label="Minimize">
            <ChevronDown size={20} color={WHITE} />
          </GlassChip>
          <Text style={{ color: alpha(WHITE, 0.75), fontSize: 11, letterSpacing: 1 }} className="font-sora-semibold uppercase">
            {queue.length > 0 ? `${currentIndex + 1} of ${queue.length}` : 'Now Playing'}
          </Text>
          <GlassChip onPress={dismiss} label="Stop and close">
            <X size={18} color={WHITE} />
          </GlassChip>
        </View>

        {/* Artwork */}
        <View className="flex-1 items-center justify-center">
          <ArtworkOrb seed={seed} size={280} playing={isPlaying} />
        </View>

        {/* Title */}
        <View className="gap-1 pb-5">
          <Text numberOfLines={1} className="font-sora-extrabold text-2xl" style={{ color: WHITE }}>
            {currentSong.title}
          </Text>
          <Text numberOfLines={1} style={{ color: alpha(WHITE, 0.7), fontSize: 15 }}>
            {currentSong.artist ?? 'Unknown artist'}
          </Text>
        </View>

        {/* Waveform seek */}
        <WaveformScrubber
          seed={seed}
          progress={progress}
          playing={isPlaying}
          color={accent}
          onSeek={(f) => seekTo((f * durationMs) / 1000)}
        />
        <View className="mt-1 flex-row justify-between">
          <Text style={{ color: alpha(WHITE, 0.6), fontSize: 11 }} className="font-sora-medium">
            {formatDuration(positionMs)}
          </Text>
          <Text style={{ color: alpha(WHITE, 0.6), fontSize: 11 }} className="font-sora-medium">
            {formatDuration(durationMs)}
          </Text>
        </View>

        {/* Transport */}
        <View className="mt-5 flex-row items-center justify-between">
          <Pressable onPress={toggleShuffle} hitSlop={12} accessibilityLabel="Shuffle">
            <Shuffle size={20} color={shuffle ? accent : alpha(WHITE, 0.55)} />
          </Pressable>

          <View className="flex-row items-center gap-7">
            <Pressable onPress={playPrevious} hitSlop={12} accessibilityLabel="Previous">
              <SkipBack size={28} color={WHITE} fill={WHITE} />
            </Pressable>
            <Pressable
              onPress={togglePlayPause}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              className="h-[72px] w-[72px] items-center justify-center rounded-full"
              style={{ backgroundColor: WHITE }}
            >
              {isPlaying ? (
                <Pause size={30} color="#0b0b10" fill="#0b0b10" />
              ) : (
                <Play size={30} color="#0b0b10" fill="#0b0b10" style={{ marginLeft: 3 }} />
              )}
            </Pressable>
            <Pressable onPress={playNext} hitSlop={12} accessibilityLabel="Next">
              <SkipForward size={28} color={WHITE} fill={WHITE} />
            </Pressable>
          </View>

          <Pressable onPress={() => setRepeatMode(REPEAT_CYCLE[repeatMode])} hitSlop={12} accessibilityLabel="Repeat">
            <RepeatIcon size={20} color={repeatMode === 'off' ? alpha(WHITE, 0.55) : accent} />
          </Pressable>
        </View>

        {/* Sleep + Up Next */}
        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={() => setSleepOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3.5"
            style={{ backgroundColor: alpha(WHITE, sleepActive ? 0.2 : 0.1), borderWidth: 1, borderColor: alpha(WHITE, 0.14) }}
          >
            <Moon size={16} color={sleepActive ? accent : WHITE} />
            <Text className="font-sora-semibold" style={{ color: WHITE }}>
              {sleepActive ? formatDuration(sleepRemainingMs) : 'Sleep'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setQueueOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3.5"
            style={{ backgroundColor: alpha(WHITE, 0.1), borderWidth: 1, borderColor: alpha(WHITE, 0.14) }}
          >
            <ListMusic size={16} color={WHITE} />
            <Text className="font-sora-semibold" style={{ color: WHITE }}>
              Up Next
            </Text>
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
