import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { displayUri, type GalleryPhoto } from '@/features/gallery/types/gallery.types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { tintGradient } from '@/lib/color';

const GALLERY_TINT = '#ec4899';

type Props = {
  /** Newest-first (as returned by usePhotos). */
  photos: GalleryPhoto[];
  onOpen: (period: string) => void;
};

function Reel({ cover, label, onPress, ring }: { cover: GalleryPhoto | null; label: string; onPress: () => void; ring: [string, string] }) {
  const scheme = useColorScheme() ?? 'light';
  return (
    <Pressable onPress={onPress} className="items-center gap-1.5" style={{ width: 76 }} accessibilityRole="button" accessibilityLabel={label}>
      <LinearGradient colors={ring} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 72, height: 72, borderRadius: 36, padding: 3, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: colors[scheme].background, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors[scheme].muted }}>
          {cover ? (
            <Image source={{ uri: displayUri(cover) }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Sparkles size={22} color={GALLERY_TINT} />
          )}
        </View>
      </LinearGradient>
      <Text variant="caption" numberOfLines={1} className="font-sora-medium">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * IG-style story highlights: one circular reel per month (newest first) plus an
 * "All" reel for the whole journey. Tapping a reel opens the full-screen story
 * player for that period.
 */
export function StoryReels({ photos, onOpen }: Props) {
  const buckets = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    for (const photo of photos) {
      const key = format(photo.takenAt, 'yyyy-MM');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(photo);
    }
    return [...map.entries()];
  }, [photos]);

  if (photos.length === 0) return null;

  const [g1, g2] = tintGradient(GALLERY_TINT);
  const allRing: [string, string] = ['#f59e0b', GALLERY_TINT];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
      <Reel cover={photos[0]} label="All" onPress={() => onOpen('all')} ring={allRing} />
      {buckets.map(([key, group]) => (
        <Reel key={key} cover={group[0]} label={format(group[0].takenAt, 'MMM yyyy')} onPress={() => onOpen(key)} ring={[g1, g2]} />
      ))}
    </ScrollView>
  );
}
