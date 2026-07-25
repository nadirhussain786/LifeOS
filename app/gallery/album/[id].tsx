import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarClock, Grid3x3, ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
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
  const [timeline, setTimeline] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: album } = useAlbum(id);
  const { data: photos = [] } = usePhotosByAlbum(id);
  const { removeAlbum } = useGalleryMutations();

  if (!album) return null;
  const meta = albumCategoryMeta(album.category);

  const addPhotos = () => setAddOpen(true);

  const confirmDelete = () => {
    Alert.alert('Delete album?', `"${album.name}" will be removed. Its photos move to All Photos — they aren't deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete album', style: 'destructive', onPress: () => (removeAlbum.mutate(album.id), router.back()) },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={album.name}
        eyebrow={`${meta.label} · ${photos.length} ${photos.length === 1 ? 'item' : 'items'}`}
        tint={meta.tint}
        right={
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => setTimeline((t) => !t)} hitSlop={8} accessibilityLabel="Toggle timeline">
              {timeline ? <Grid3x3 size={20} color={colors[scheme].foreground} /> : <CalendarClock size={20} color={colors[scheme].foreground} />}
            </Pressable>
            <Pressable onPress={addPhotos} hitSlop={8} accessibilityLabel="Add photos">
              <ImagePlus size={20} color={colors[scheme].foreground} />
            </Pressable>
            <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete album">
              <Trash2 size={19} color={colors[scheme].destructive} />
            </Pressable>
          </View>
        }
      />

      {photos.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title="Nothing here yet"
          description="Add your first photo or video to this album to start tracking."
          tint={meta.tint}
          actionLabel="Add media"
          onAction={addPhotos}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <PhotoGrid photos={photos} timeline={timeline} onPressPhoto={(photo) => router.push(`/gallery/photo/${photo.id}`)} />
        </ScrollView>
      )}

      <AddMediaSheet visible={addOpen} onClose={() => setAddOpen(false)} albumId={album.id} />
    </View>
  );
}
