import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { MUSIC_TINT } from '@/features/music/components/song-row';
import type { Playlist } from '@/features/music/types/music.types';

type Props = {
  playlist: Playlist;
  onPress: () => void;
};

export function PlaylistTile({ playlist, onPress }: Props) {
  const tint = playlist.colorToken ?? MUSIC_TINT;

  return (
    <Pressable onPress={onPress} className="w-36 gap-2">
      <View className="h-36 w-36 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tint}22` }}>
        <Text className="text-3xl">🎧</Text>
      </View>
      <View className="gap-0.5">
        <Text className="font-sora-medium" numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text variant="caption">
          {playlist.songCount} song{playlist.songCount === 1 ? '' : 's'}
        </Text>
      </View>
    </Pressable>
  );
}
