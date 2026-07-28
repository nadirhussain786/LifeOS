import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Images, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AddMediaSheet } from '@/features/gallery/components/add-media-sheet';
import { ProgressPostCard } from '@/features/gallery/components/progress-post-card';
import { useAlbums, usePhotos } from '@/features/gallery/hooks/use-gallery';
import { useGalleryMutations } from '@/features/gallery/hooks/use-gallery-mutations';
import type { GalleryPhoto } from '@/features/gallery/types/gallery.types';

const GALLERY_TINT = '#ec4899';

export default function FeedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const { data: photos = [] } = usePhotos();
  const { data: albums = [] } = useAlbums();
  const { toggleFavorite } = useGalleryMutations();

  const albumName = useMemo(() => new Map(albums.map((a) => [a.id, a.name])), [albums]);

  const share = async (photo: GalleryPhoto) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(photo.uri, { dialogTitle: t('gallery.shareDialogTitle') });
      } else {
        Alert.alert(t('gallery.sharingUnavailableTitle'), t('gallery.sharingUnavailableBody'));
      }
    } catch {
      Alert.alert(t('gallery.couldNotShareTitle'), t('gallery.couldNotShareBody'));
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={t('gallery.yourFeed')}
        eyebrow={t('gallery.title')}
        tint={GALLERY_TINT}
        actions={[{ icon: Plus, label: t('gallery.addMedia'), onPress: () => setAddOpen(true) }]}
      />

      {photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title={t('gallery.feedEmptyTitle')}
          description={t('gallery.feedEmptyBody')}
          tint={GALLERY_TINT}
          actionLabel={t('gallery.addMedia')}
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
