import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ChevronLeft, ChevronRight, GitCompareArrows, Heart, Images, LayoutGrid, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { HeroCard } from '@/components/ui/hero-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { AddMediaSheet } from '@/features/gallery/components/add-media-sheet';
import { AlbumCard } from '@/features/gallery/components/album-card';
import { ProgressPostCard } from '@/features/gallery/components/progress-post-card';
import { useAlbums, useFavoritePhotos, usePhotos } from '@/features/gallery/hooks/use-gallery';
import { useGalleryMutations } from '@/features/gallery/hooks/use-gallery-mutations';
import type { GalleryPhoto } from '@/features/gallery/types/gallery.types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha, glowShadow, tintGradient } from '@/lib/color';

const GALLERY_TINT = '#ec4899';

export default function GalleryScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [addOpen, setAddOpen] = useState(false);

  const { data: albums = [], isLoading } = useAlbums();
  const { data: photos = [] } = usePhotos();
  const { data: favorites = [] } = useFavoritePhotos();
  const { toggleFavorite } = useGalleryMutations();

  const albumWidth = (Dimensions.get('window').width - 32 - 12) / 2;
  const albumName = useMemo(() => new Map(albums.map((a) => [a.id, a.name])), [albums]);

  const share = async (photo: GalleryPhoto) => {
    try {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(photo.uri, { dialogTitle: 'Share your progress' });
    } catch {
      Alert.alert('Could not share', 'Something went wrong sharing this moment.');
    }
  };

  const stats = useMemo(() => {
    const videos = photos.reduce((n, p) => n + (p.mediaType === 'video' ? 1 : 0), 0);
    const days = new Set(photos.map((p) => format(p.takenAt, 'yyyy-MM-dd'))).size;
    const first = photos.length ? Math.min(...photos.map((p) => p.takenAt)) : null;
    return { total: photos.length, videos, photos: photos.length - videos, days, first };
  }, [photos]);

  const feedPreview = photos.slice(0, 3);

  const quickTiles = [
    { key: 'all', label: 'All Media', icon: Images, tint: '#0ea5e9', count: photos.length, route: '/gallery/all' },
    { key: 'fav', label: 'Favorites', icon: Heart, tint: '#ef4444', count: favorites.length, route: '/gallery/all?favorites=1' },
    { key: 'compare', label: 'Before & After', icon: GitCompareArrows, tint: '#8b5cf6', count: null, route: '/gallery/compare' },
  ];

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-1 px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
          <ChevronLeft size={24} color={colors[scheme].foreground} />
        </Pressable>
        <Text variant="heading">Progress</Text>
      </View>

      {isLoading ? (
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </View>
      ) : albums.length === 0 && photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Track your progress"
          description="Capture photos and videos of your transformation — gym gains, milestones, memories — and compare them over time."
          tint={GALLERY_TINT}
          actionLabel="Add media"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <ScrollView contentContainerClassName="gap-6 px-4 pb-28" showsVerticalScrollIndicator={false}>
          {/* Stats hero */}
          <HeroCard tint={GALLERY_TINT}>
            <View className="gap-4">
              <View className="gap-0.5">
                <Text className="font-sora-extrabold text-4xl" style={{ color: '#ffffff' }}>
                  {stats.total}
                </Text>
                <Text className="font-sora-medium" style={{ color: alpha('#ffffff', 0.9) }}>
                  moments captured{stats.first ? ` · since ${format(stats.first, 'MMM yyyy')}` : ''}
                </Text>
              </View>
              <View className="flex-row rounded-2xl p-3" style={{ backgroundColor: alpha('#ffffff', 0.15) }}>
                {[
                  { label: 'Photos', value: stats.photos },
                  { label: 'Videos', value: stats.videos },
                  { label: 'Days', value: stats.days },
                ].map((item) => (
                  <View key={item.label} className="flex-1 items-center gap-1">
                    <Text className="font-sora-bold text-lg" style={{ color: '#ffffff' }}>
                      {item.value}
                    </Text>
                    <Text style={{ color: alpha('#ffffff', 0.85), fontSize: 11 }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </HeroCard>

          {/* Feed CTA */}
          <Pressable
            onPress={() => router.push('/gallery/feed')}
            style={[{ borderRadius: 20, overflow: 'hidden' }, glowShadow(GALLERY_TINT, 0.28)]}
          >
            <LinearGradient colors={tintGradient(GALLERY_TINT)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
              <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: alpha('#ffffff', 0.2) }}>
                <LayoutGrid size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-sora-bold" style={{ color: '#ffffff', fontSize: 16 }}>
                  Your Progress Feed
                </Text>
                <Text style={{ color: alpha('#ffffff', 0.9), fontSize: 12 }}>A personal, shareable timeline</Text>
              </View>
              <ChevronRight size={20} color="#ffffff" />
            </LinearGradient>
          </Pressable>

          {/* Quick tiles */}
          <View className="flex-row gap-2.5">
            {quickTiles.map((tile) => {
              const Icon = tile.icon;
              const [g1, g2] = tintGradient(tile.tint);
              return (
                <Pressable
                  key={tile.key}
                  onPress={() => router.push(tile.route as never)}
                  style={[{ flex: 1, borderRadius: 20, overflow: 'hidden' }, glowShadow(tile.tint, 0.25)]}
                >
                  <LinearGradient colors={[g1, g2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: 'center', gap: 6, paddingVertical: 18 }}>
                    <Icon size={20} color="#ffffff" />
                    <Text className="font-sora-semibold" style={{ color: '#ffffff', fontSize: 13 }} numberOfLines={1}>
                      {tile.label}
                    </Text>
                    {tile.count !== null && <Text style={{ color: alpha('#ffffff', 0.85), fontSize: 11 }}>{tile.count}</Text>}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* Feed preview */}
          {feedPreview.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="subheading">From your feed</Text>
                <Pressable onPress={() => router.push('/gallery/feed')} hitSlop={8}>
                  <Text variant="caption" style={{ color: GALLERY_TINT }} className="font-sora-semibold">
                    See all
                  </Text>
                </Pressable>
              </View>
              <View className="gap-4">
                {feedPreview.map((item) => (
                  <ProgressPostCard
                    key={item.id}
                    photo={item}
                    albumName={item.albumId ? albumName.get(item.albumId) : null}
                    onOpen={(p) => router.push(`/gallery/photo/${p.id}`)}
                    onLike={(p) => toggleFavorite.mutate({ id: p.id, isFavorite: !p.isFavorite })}
                    onShare={share}
                    onCompare={() => router.push('/gallery/compare')}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Albums */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text variant="subheading">Albums</Text>
              <Pressable onPress={() => router.push('/gallery/album/new')} hitSlop={8} className="flex-row items-center gap-1">
                <Plus size={15} color={GALLERY_TINT} />
                <Text variant="caption" style={{ color: GALLERY_TINT }} className="font-sora-semibold">
                  New album
                </Text>
              </Pressable>
            </View>

            {albums.length === 0 ? (
              <Pressable
                onPress={() => router.push('/gallery/album/new')}
                className="flex-row items-center gap-3 rounded-2xl border border-dashed border-border p-4"
              >
                <Images size={20} color={colors[scheme].mutedForeground} />
                <Text variant="muted" className="flex-1">
                  Create an album to organize your photos and videos by theme.
                </Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} width={albumWidth} onPress={(a) => router.push(`/gallery/album/${a.id}`)} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Fab onPress={() => setAddOpen(true)} accessibilityLabel="Add media" />

      <AddMediaSheet visible={addOpen} onClose={() => setAddOpen(false)} albumId={null} />
    </View>
  );
}
