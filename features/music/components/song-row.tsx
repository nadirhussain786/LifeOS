import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Pause, Play, Trash2, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { SwipeableRow } from '@/components/ui/swipeable-row';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { Equalizer } from '@/features/music/components/equalizer';
import { songGradient } from '@/features/music/utils/song-art';
import { formatDuration } from '@/features/music/utils/format-duration';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Song } from '@/features/music/types/music.types';

/** Music's signature chrome tint — teal, matching the Hub tile. Per-song art
 *  (song-art.ts) supplies the color variety; this is only for controls/labels. */
export const MUSIC_TINT = '#14b8a6';

type Props = {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
  /** Opens the song's rename/details screen — kept off the main tap target since tapping a row plays it. */
  onLongPress?: () => void;
  /** Library context: permanently deletes the song and frees its file. */
  onDelete?: () => void;
  /** Playlist context: unlinks the song from this playlist only. */
  onRemove?: () => void;
};

export function SongRow({ song, isActive, isPlaying, onPress, onLongPress, onDelete, onRemove }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const [c1, c2, c3] = songGradient(song.id);

  const row = (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 py-2.5 pl-4 pr-4"
    >
      {/* Generative art thumbnail */}
      <View className="h-11 w-11 overflow-hidden rounded-xl">
        <LinearGradient colors={[c1, c2, c3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.32)' }}>
            {isActive && isPlaying ? (
              <Equalizer size={13} playing color="#ffffff" />
            ) : isActive ? (
              <Pause size={13} color="#ffffff" fill="#ffffff" />
            ) : (
              <Play size={12} color="#ffffff" fill="#ffffff" style={{ marginLeft: 1 }} />
            )}
          </View>
        </LinearGradient>
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="font-sora-medium" numberOfLines={1} style={{ color: isActive ? MUSIC_TINT : colors[scheme].foreground }}>
          {song.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {song.artist ?? 'Unknown artist'}
        </Text>
      </View>

      <Text variant="caption">{formatDuration(song.durationMs)}</Text>
    </Pressable>
  );

  if (!onDelete && !onRemove) return row;

  return (
    <SwipeableRow
      actions={
        onDelete ? (
          <Pressable onPress={onDelete} accessibilityLabel={`Delete "${song.title}"`} className="flex-1 items-center justify-center bg-destructive">
            <Trash2 color={colors[scheme].primaryForeground} size={18} />
          </Pressable>
        ) : (
          <Pressable onPress={onRemove} accessibilityLabel={`Remove "${song.title}" from playlist`} className="flex-1 items-center justify-center bg-secondary">
            <X color={colors[scheme].foreground} size={18} />
          </Pressable>
        )
      }
    >
      {row}
    </SwipeableRow>
  );
}
