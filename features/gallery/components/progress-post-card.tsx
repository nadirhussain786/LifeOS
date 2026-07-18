import { formatDistanceToNow } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, GitCompareArrows, Heart, Play, Share2, Video } from 'lucide-react-native';
import { Dimensions, Image, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { displayUri, formatDuration, type GalleryPhoto } from '@/features/gallery/types/gallery.types';
import { alpha, tintGradient } from '@/lib/color';

const GALLERY_TINT = '#ec4899';

type Props = {
  photo: GalleryPhoto;
  albumName?: string | null;
  onOpen: (photo: GalleryPhoto) => void;
  onLike: (photo: GalleryPhoto) => void;
  onShare: (photo: GalleryPhoto) => void;
  onCompare: () => void;
};

/** A single progress moment rendered as a social-style post: avatar + relative
 * time header, the media, and like / compare / share actions. The building
 * block of the personal progress feed. */
export function ProgressPostCard({ photo, albumName, onOpen, onLike, onShare, onCompare }: Props) {
  const isVideo = photo.mediaType === 'video';
  const outerW = Dimensions.get('window').width - 32;

  const ratio = photo.width && photo.height ? photo.width / photo.height : 1;
  const mediaH = Math.round(Math.min(Math.max(outerW / ratio, outerW * 0.7), outerW * 1.35));

  const [g1, g2] = tintGradient(GALLERY_TINT);
  const AvatarIcon = isVideo ? Video : Camera;

  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-card">
      {/* Header */}
      <View className="flex-row items-center gap-2.5 px-3.5 py-3">
        <LinearGradient colors={[g1, g2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 38, width: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
          <AvatarIcon size={18} color="#ffffff" />
        </LinearGradient>
        <View className="flex-1">
          <Text className="font-sora-bold text-foreground">You</Text>
          <Text variant="caption">
            {formatDistanceToNow(photo.takenAt, { addSuffix: true })}
            {albumName ? ` · ${albumName}` : ''}
          </Text>
        </View>
      </View>

      {/* Media */}
      <Pressable onPress={() => onOpen(photo)} accessibilityRole="imagebutton">
        <Image source={{ uri: displayUri(photo) }} style={{ width: outerW, height: mediaH, backgroundColor: alpha(GALLERY_TINT, 0.08) }} />
        {isVideo && (
          <>
            <View className="absolute inset-0 items-center justify-center">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                <Play size={24} color="#ffffff" fill="#ffffff" />
              </View>
            </View>
            <View className="absolute bottom-2 right-2 rounded-md px-2 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
              <Text className="text-[11px] font-sora-semibold text-white">{formatDuration(photo.durationMs)}</Text>
            </View>
          </>
        )}
      </Pressable>

      {/* Actions */}
      <View className="flex-row items-center gap-5 px-4 py-3">
        <Pressable onPress={() => onLike(photo)} hitSlop={8} className="flex-row items-center gap-1.5" accessibilityLabel="Like">
          <Heart size={20} color="#ef4444" fill={photo.isFavorite ? '#ef4444' : 'transparent'} />
          {photo.isFavorite && <Text className="font-sora-semibold" style={{ color: '#ef4444', fontSize: 13 }}>Loved</Text>}
        </Pressable>
        <Pressable onPress={onCompare} hitSlop={8} accessibilityLabel="Compare">
          <GitCompareArrows size={20} color="#8b5cf6" />
        </Pressable>
        <View className="flex-1" />
        <Pressable onPress={() => onShare(photo)} hitSlop={8} accessibilityLabel="Share">
          <Share2 size={19} color="#0ea5e9" />
        </Pressable>
      </View>

      {/* Caption + tags */}
      {(photo.caption || photo.tags.length > 0) && (
        <View className="gap-2 px-4 pb-4">
          {photo.caption ? (
            <Text className="text-foreground">
              <Text className="font-sora-bold text-foreground">You </Text>
              {photo.caption}
            </Text>
          ) : null}
          {photo.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {photo.tags.map((tag) => (
                <Text key={tag} style={{ color: GALLERY_TINT, fontSize: 13 }} className="font-sora-medium">
                  #{tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
