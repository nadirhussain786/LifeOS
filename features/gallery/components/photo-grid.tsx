import { format } from 'date-fns';
import { Heart, Play } from 'lucide-react-native';
import { useMemo } from 'react';
import { Dimensions, Image, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { displayUri, formatDuration, type GalleryPhoto } from '@/features/gallery/types/gallery.types';

const COLUMNS = 3;
const GAP = 4;
const H_PADDING = 16;

function tileSize() {
  const width = Dimensions.get('window').width;
  return (width - H_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
}

function PhotoTile({ photo, size, onPress }: { photo: GalleryPhoto; size: number; onPress: (p: GalleryPhoto) => void }) {
  const isVideo = photo.mediaType === 'video';
  return (
    <Pressable
      onPress={() => onPress(photo)}
      style={{ width: size, height: size }}
      accessibilityRole="imagebutton"
      accessibilityLabel={photo.caption ?? (isVideo ? 'Video' : 'Photo')}
    >
      <Image source={{ uri: displayUri(photo) }} style={{ width: size, height: size, borderRadius: 10, backgroundColor: '#00000010' }} />
      {isVideo && (
        <>
          <View className="absolute inset-0 items-center justify-center">
            <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
              <Play size={15} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
          <View className="absolute bottom-1 right-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <Text className="text-[10px] font-sora-semibold text-white">{formatDuration(photo.durationMs)}</Text>
          </View>
        </>
      )}
      {photo.isFavorite && (
        <View className="absolute left-1 top-1 h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Heart size={11} color="#ffffff" fill="#ffffff" />
        </View>
      )}
    </Pressable>
  );
}

type Props = {
  photos: GalleryPhoto[];
  onPressPhoto: (photo: GalleryPhoto) => void;
  /** Group photos under month headers (newest first) instead of one flat grid. */
  timeline?: boolean;
};

/** A square 3-up photo grid. In timeline mode the photos are bucketed by the
 * month they were taken so a transformation reads chronologically. Renders as
 * plain wrapping rows (no own scroll) so it composes inside a screen ScrollView. */
export function PhotoGrid({ photos, onPressPhoto, timeline }: Props) {
  const size = tileSize();

  const groups = useMemo(() => {
    if (!timeline) return null;
    const map = new Map<string, GalleryPhoto[]>();
    for (const photo of photos) {
      const key = format(photo.takenAt, 'MMMM yyyy');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(photo);
    }
    return [...map.entries()];
  }, [photos, timeline]);

  if (groups) {
    return (
      <View className="gap-4">
        {groups.map(([month, monthPhotos]) => (
          <View key={month} className="gap-2">
            <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
              {month}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {monthPhotos.map((photo) => (
                <PhotoTile key={photo.id} photo={photo} size={size} onPress={onPressPhoto} />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {photos.map((photo) => (
        <PhotoTile key={photo.id} photo={photo} size={size} onPress={onPressPhoto} />
      ))}
    </View>
  );
}
