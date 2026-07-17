import * as Haptics from 'expo-haptics';
import { Pause, Play, Trash2, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { SwipeableRow } from '@/components/ui/swipeable-row';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { formatDuration } from '@/features/music/utils/format-duration';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Song } from '@/features/music/types/music.types';

export const MUSIC_TINT = '#6366f1';

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

  const row = (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 py-3 pl-4 pr-4"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isActive ? MUSIC_TINT : colors[scheme].muted }}
      >
        {isActive && isPlaying ? (
          <Pause size={14} color="#ffffff" fill="#ffffff" />
        ) : (
          <Play size={14} color={isActive ? '#ffffff' : colors[scheme].mutedForeground} fill={isActive ? '#ffffff' : 'transparent'} />
        )}
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
