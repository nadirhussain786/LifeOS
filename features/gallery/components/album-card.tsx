import { Video } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { albumCategoryMeta } from '@/features/gallery/config/album-categories';
import type { AlbumWithCover } from '@/features/gallery/types/gallery.types';

type Props = {
  album: AlbumWithCover;
  width: number;
  onPress: (album: AlbumWithCover) => void;
};

export function AlbumCard({ album, width, onPress }: Props) {
  const meta = albumCategoryMeta(album.category);
  const Icon = meta.icon;

  return (
    <Pressable onPress={() => onPress(album)} style={{ width }} accessibilityRole="button" accessibilityLabel={album.name}>
      <View style={{ width, height: width, borderRadius: 16, overflow: 'hidden', backgroundColor: `${meta.tint}1f` }}>
        {album.coverUri ? (
          <Image source={{ uri: album.coverUri }} style={{ width, height: width }} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Icon size={30} color={meta.tint} strokeWidth={1.75} />
          </View>
        )}
        <View className="absolute left-2 top-2 flex-row items-center gap-1.5">
          <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <Icon size={11} color="#ffffff" />
            <Text className="text-[10px] font-sora-semibold text-white">{album.photoCount}</Text>
          </View>
          {album.videoCount > 0 && (
            <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <Video size={11} color="#ffffff" />
              <Text className="text-[10px] font-sora-semibold text-white">{album.videoCount}</Text>
            </View>
          )}
        </View>
      </View>
      <View className="mt-1.5 gap-0.5">
        <Text className="font-sora-semibold text-foreground" numberOfLines={1}>
          {album.name}
        </Text>
        <Text variant="caption">{meta.label}</Text>
      </View>
    </Pressable>
  );
}
