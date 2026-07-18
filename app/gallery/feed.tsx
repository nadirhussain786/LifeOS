import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ChevronLeft, Images, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { AddMediaSheet } from '@/features/gallery/components/add-media-sheet';
import { ProgressPostCard } from '@/features/gallery/components/progress-post-card';
import { useAlbums, usePhotos } from '@/features/gallery/hooks/use-gallery';
import { useGalleryMutations } from '@/features/gallery/hooks/use-gallery-mutations';
import type { GalleryPhoto } from '@/features/gallery/types/gallery.types';
import { useColorScheme } from '@/hooks/use-color-scheme';

const GALLERY_TINT = '#ec4899';

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const [addOpen, setAddOpen] = useState(false);

  const { data: photos = [] } = usePhotos();
  const { data: albums = [] } = useAlbums();
  const { toggleFavorite } = useGalleryMutations();

  const albumName = useMemo(() => new Map(albums.map((a) => [a.id, a.name])), [albums]);

  const share = async (photo: GalleryPhoto) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(photo.uri, { dialogTitle: 'Share your progress' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Could not share', 'Something went wrong sharing this moment.');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-4 pb-2">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors[scheme].foreground} />
          </Pressable>
          <Text variant="heading">Your Feed</Text>
        </View>
        <Pressable onPress={() => setAddOpen(true)} hitSlop={8} accessibilityLabel="Add media">
          <Plus size={22} color={colors[scheme].foreground} />
        </Pressable>
      </View>

      {photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Your progress feed is empty"
          description="Add photos and videos to build a personal, shareable timeline of your journey."
          tint={GALLERY_TINT}
          actionLabel="Add media"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProgressPostCard
              photo={item}
              albumName={item.albumId ? albumName.get(item.albumId) : null}
              onOpen={(p) => router.push(`/gallery/photo/${p.id}`)}
              onLike={(p) => toggleFavorite.mutate({ id: p.id, isFavorite: !p.isFavorite })}
              onShare={share}
              onCompare={() => router.push('/gallery/compare')}
            />
          )}
        />
      )}

      <AddMediaSheet visible={addOpen} onClose={() => setAddOpen(false)} albumId={null} />
    </View>
  );
}
