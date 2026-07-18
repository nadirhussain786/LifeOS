import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarClock, ChevronLeft, Grid3x3, Heart, Images, Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { AddMediaSheet } from '@/features/gallery/components/add-media-sheet';
import { PhotoGrid } from '@/features/gallery/components/photo-grid';
import { usePhotos } from '@/features/gallery/hooks/use-gallery';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AllPhotosScreen() {
  const { favorites: favoritesParam } = useLocalSearchParams<{ favorites?: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  const { data: photos = [] } = usePhotos();
  const [timeline, setTimeline] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(favoritesParam === '1');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return photos.filter((photo) => {
      if (favoritesOnly && !photo.isFavorite) return false;
      if (q) {
        const inCaption = (photo.caption ?? '').toLowerCase().includes(q);
        const inTags = photo.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!inCaption && !inTags) return false;
      }
      return true;
    });
  }, [photos, favoritesOnly, query]);

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-4 pb-2">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
            <ChevronLeft size={24} color={colors[scheme].foreground} />
          </Pressable>
          <Text variant="heading">{favoritesOnly ? 'Favorites' : 'All Photos'}</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => setShowSearch((s) => !s)} hitSlop={8} accessibilityLabel="Search">
            <Search size={20} color={colors[scheme].foreground} />
          </Pressable>
          <Pressable onPress={() => setFavoritesOnly((f) => !f)} hitSlop={8} accessibilityLabel="Toggle favorites">
            <Heart size={20} color={favoritesOnly ? '#ef4444' : colors[scheme].foreground} fill={favoritesOnly ? '#ef4444' : 'transparent'} />
          </Pressable>
          <Pressable onPress={() => setTimeline((t) => !t)} hitSlop={8} accessibilityLabel="Toggle timeline">
            {timeline ? <Grid3x3 size={20} color={colors[scheme].foreground} /> : <CalendarClock size={20} color={colors[scheme].foreground} />}
          </Pressable>
          <Pressable onPress={() => setAddOpen(true)} hitSlop={8} accessibilityLabel="Add media">
            <Plus size={22} color={colors[scheme].foreground} />
          </Pressable>
        </View>
      </View>

      {showSearch && (
        <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-full bg-muted px-4 py-2.5">
          <Search size={16} color={colors[scheme].mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search captions & tags"
            placeholderTextColor={colors[scheme].mutedForeground}
            autoFocus
            className="flex-1 text-foreground"
          />
        </View>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={favoritesOnly ? Heart : Images}
          title={favoritesOnly ? 'No favorites yet' : query ? 'No matches' : 'No photos yet'}
          description={
            favoritesOnly ? 'Tap the heart on any photo to keep it here.' : query ? 'Try a different caption or tag.' : 'Add your first photo or video to get started.'
          }
          tint="#ec4899"
          actionLabel={!favoritesOnly && !query ? 'Add media' : undefined}
          onAction={!favoritesOnly && !query ? () => setAddOpen(true) : undefined}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <PhotoGrid photos={filtered} timeline={timeline && !query} onPressPhoto={(photo) => router.push(`/gallery/photo/${photo.id}`)} />
        </ScrollView>
      )}

      {filtered.length > 0 && <Fab onPress={() => setAddOpen(true)} accessibilityLabel="Add media" />}

      <AddMediaSheet visible={addOpen} onClose={() => setAddOpen(false)} albumId={null} />
    </View>
  );
}
