import { differenceInCalendarDays, format } from 'date-fns';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { ArrowForward } from '@/components/ui/directional-icon';
import { Text } from '@/components/ui/text';
import { displayUri, type GalleryPhoto } from '@/features/gallery/types/gallery.types';
import { alpha, glowShadow, tintGradientTriple } from '@/lib/color';

const GALLERY_TINT = '#ec4899';

type Props = {
  /** Newest-first (as returned by usePhotos). */
  photos: GalleryPhoto[];
  onPlay: () => void;
};

/**
 * The signature Progress hero: your transformation at a glance — the very first
 * moment beside the latest, with the day-count between them — over a gradient
 * wash. Tapping it plays your whole journey as a full-screen story.
 */
export function JourneyHero({ photos, onPlay }: Props) {
  const { t } = useTranslation();

  if (photos.length === 0) return null;

  const latest = photos[0];
  const first = photos[photos.length - 1];
  const days = Math.max(0, differenceInCalendarDays(latest.takenAt, first.takenAt));
  const [g1, g2, g3] = tintGradientTriple(GALLERY_TINT);

  const Thumb = ({ photo, label }: { photo: GalleryPhoto; label: string }) => (
    <View className="items-center gap-1.5">
      <View
        style={{
          width: 76,
          height: 96,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: alpha('#ffffff', 0.5),
        }}
      >
        <Image
          source={{ uri: displayUri(photo) }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          recyclingKey={photo.id}
        />
      </View>
      <Text
        style={{ color: alpha('#ffffff', 0.9), fontSize: 10, letterSpacing: 1 }}
        className="font-sora-bold uppercase"
      >
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPlay}
      style={[{ borderRadius: 28, overflow: 'hidden' }, glowShadow(GALLERY_TINT, 0.35)]}
      accessibilityRole="button"
      accessibilityLabel={t('gallery.playJourney')}
    >
      <LinearGradient
        colors={[g1, g2, g3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18, gap: 16 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -40,
            right: -30,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: alpha('#ffffff', 0.12),
          }}
        />

        <View className="flex-row items-center justify-between">
          <Text
            style={{ color: alpha('#ffffff', 0.9), fontSize: 11, letterSpacing: 1.2 }}
            className="font-sora-bold uppercase"
          >
            {t('gallery.yourJourney')}
          </Text>
          <View
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: alpha('#ffffff', 0.22) }}
          >
            <Play size={12} color="#ffffff" fill="#ffffff" />
            <Text className="font-sora-semibold" style={{ color: '#ffffff', fontSize: 12 }}>
              {t('gallery.playStory')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Thumb photo={first} label={t('gallery.dayOne')} />
            <ArrowForward size={20} color={alpha('#ffffff', 0.85)} />
            <Thumb photo={latest} label={t('gallery.now')} />
          </View>
          <View className="items-end">
            <Text
              className="font-sora-extrabold"
              style={{ color: '#ffffff', fontSize: 40, lineHeight: 44 }}
            >
              {days}
            </Text>
            <Text
              style={{ color: alpha('#ffffff', 0.9), fontSize: 12 }}
              className="font-sora-semibold"
            >
              {t('gallery.daysStrong', { count: days })}
            </Text>
          </View>
        </View>

        <Text style={{ color: alpha('#ffffff', 0.9), fontSize: 12 }}>
          {t('gallery.momentsSince', {
            moments: t('gallery.momentsCount', { count: photos.length }),
            date: format(first.takenAt, 'MMM yyyy'),
          })}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
