import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarClock, Grid3x3, ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { colors } from '@/constants/theme';
import { albumCategoryMeta } from '@/features/gallery/config/album-categories';
import { AddMediaSheet } from '@/features/gallery/components/add-media-sheet';
import { PhotoGrid } from '@/features/gallery/components/photo-grid';
import { useAlbum, usePhotosByAlbum } from '@/features/gallery/hooks/use-gallery';
import { useGalleryMutations } from '@/features/gallery/hooks/use-gallery-mutations';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const [timeline, setTimeline] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: album } = useAlbum(id);
  const { data: photos = [] } = usePhotosByAlbum(id);
  const { removeAlbum } = useGalleryMutations();

  if (!album) return null;
  const meta = albumCategoryMeta(album.category);

  const addPhotos = () => setAddOpen(true);

  const confirmDelete = () => {
    Alert.alert(t('gallery.deleteAlbumTitle'), t('gallery.deleteAlbumBody', { name: album.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('gallery.deleteAlbum'),
        style: 'destructive',
        onPress: () => (removeAlbum.mutate(album.id), router.back()),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={album.name}
        eyebrow={t('gallery.albumEyebrow', {
          category: t(meta.labelKey),
          items: t('gallery.itemsCount', { count: photos.length }),
        })}
        tint={meta.tint}
        right={
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => setTimeline((t) => !t)}
              hitSlop={8}
              accessibilityLabel={t('gallery.toggleTimeline')}
            >
              {timeline ? (
                <Grid3x3 size={20} color={colors[scheme].foreground} />
              ) : (
                <CalendarClock size={20} color={colors[scheme].foreground} />
              )}
            </Pressable>
            <Pressable onPress={addPhotos} hitSlop={8} accessibilityLabel={t('gallery.addPhotos')}>
              <ImagePlus size={20} color={colors[scheme].foreground} />
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              hitSlop={8}
              accessibilityLabel={t('gallery.deleteAlbum')}
            >
              <Trash2 size={19} color={colors[scheme].destructive} />
            </Pressable>
          </View>
        }
      />

      {photos.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title={t('gallery.albumEmptyTitle')}
          description={t('gallery.albumEmptyBody')}
          tint={meta.tint}
          actionLabel={t('gallery.addMedia')}
          onAction={addPhotos}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <PhotoGrid
            photos={photos}
            timeline={timeline}
            onPressPhoto={(photo) => router.push(`/gallery/photo/${photo.id}`)}
          />
        </ScrollView>
      )}

      <AddMediaSheet visible={addOpen} onClose={() => setAddOpen(false)} albumId={album.id} />
    </View>
  );
}
