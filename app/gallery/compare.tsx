import Slider from '@react-native-community/slider';
import { differenceInCalendarDays, format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Bookmark, ChevronLeft, GitCompareArrows, Share2, Sparkles, TrendingUp } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Dimensions, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { EmptyState } from '@/components/ui/empty-state';
import { GradientButton } from '@/components/ui/gradient-button';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { usePhotos } from '@/features/gallery/hooks/use-gallery';
import { useGalleryMutations } from '@/features/gallery/hooks/use-gallery-mutations';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha, tintGradient } from '@/lib/color';

const COMPARE_TINT = '#8b5cf6';

const LAYOUT_OPTIONS = [
  { value: 'split' as const, label: 'Side by side' },
  { value: 'slider' as const, label: 'Slider' },
];

type Layout = 'split' | 'slider';

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { data: photos = [] } = usePhotos();

  // Only still photos can anchor a before/after.
  const stills = photos.filter((p) => p.mediaType === 'photo');

  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [active, setActive] = useState<'before' | 'after'>('before');
  const [layout, setLayout] = useState<Layout>('split');
  const [reveal, setReveal] = useState(0.5);
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { saveComparison } = useGalleryMutations();

  const cardRef = useRef<View>(null);

  const before = stills.find((p) => p.id === beforeId) ?? null;
  const after = stills.find((p) => p.id === afterId) ?? null;
  const ready = !!before && !!after;

  const outerW = Dimensions.get('window').width - 32;
  const pad = 14;
  const innerW = outerW - pad * 2;
  const splitW = (innerW - 10) / 2;
  const splitH = Math.round(splitW * 1.3);
  const sliderH = innerW;

  const elapsed = ready ? Math.abs(differenceInCalendarDays(after!.takenAt, before!.takenAt)) : 0;

  const assign = (photoId: string) => {
    if (active === 'before') {
      setBeforeId(photoId);
      setActive('after');
    } else {
      setAfterId(photoId);
      setActive('before');
    }
  };

  const share = async () => {
    if (!ready || sharing) return;
    try {
      setSharing(true);
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your progress' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Could not share', 'Something went wrong creating your progress image.');
    } finally {
      setSharing(false);
    }
  };

  const saveToFeed = async () => {
    if (!ready || saving) return;
    try {
      setSaving(true);
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await saveComparison.mutateAsync({ tempUri: uri, caption, takenAt: after!.takenAt });
      Alert.alert('Saved to feed', 'Your before & after was added to your progress feed.', [
        { text: 'View feed', onPress: () => router.push('/gallery/feed') },
        { text: 'Done', style: 'cancel' },
      ]);
    } catch {
      Alert.alert('Could not save', 'Something went wrong saving your comparison.');
    } finally {
      setSaving(false);
    }
  };

  if (stills.length < 2) {
    return (
      <View className="flex-1 bg-background">
        <Header insets={insets} scheme={scheme} onBack={() => router.back()} />
        <EmptyState
          icon={GitCompareArrows}
          title="Add more photos"
          description="You need at least two photos to build a before-and-after comparison."
          tint={COMPARE_TINT}
        />
      </View>
    );
  }

  const [g1, g2] = tintGradient(COMPARE_TINT);

  return (
    <View className="flex-1 bg-background">
      <Header insets={insets} scheme={scheme} onBack={() => router.back()} />

      <ScrollView contentContainerClassName="gap-5 px-4 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* The shareable Progress Post card */}
        <View
          ref={cardRef}
          collapsable={false}
          style={{ width: outerW, borderRadius: 24, overflow: 'hidden', backgroundColor: colors[scheme].card, borderWidth: 1, borderColor: colors[scheme].border }}
        >
          {/* Gradient accent strip */}
          <LinearGradient colors={[g1, g2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 5, width: '100%' }} />

          {/* Post header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: pad }}>
            <LinearGradient colors={[g1, g2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="#ffffff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text className="font-sora-bold text-foreground">My Progress</Text>
              <Text variant="caption">
                {ready ? `${format(before!.takenAt, 'MMM d, yyyy')} → ${format(after!.takenAt, 'MMM d, yyyy')}` : 'Pick a before & after'}
              </Text>
            </View>
            {ready && elapsed > 0 && (
              <View style={{ alignItems: 'center', backgroundColor: alpha(COMPARE_TINT, 0.12), borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text className="font-sora-extrabold" style={{ color: COMPARE_TINT, fontSize: 18, lineHeight: 22 }}>
                  {elapsed}
                </Text>
                <Text style={{ color: COMPARE_TINT, fontSize: 9, fontFamily: 'Sora_600SemiBold' }}>DAYS</Text>
              </View>
            )}
          </View>

          {/* Media */}
          {ready ? (
            layout === 'split' ? (
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: pad }}>
                {[
                  { photo: before!, label: 'BEFORE' },
                  { photo: after!, label: 'AFTER' },
                ].map(({ photo, label }) => (
                  <View key={label} style={{ width: splitW }}>
                    <View style={{ width: splitW, height: splitH, borderRadius: 14, overflow: 'hidden' }}>
                      <Image source={{ uri: photo.uri }} style={{ width: splitW, height: splitH }} resizeMode="cover" />
                      <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text className="text-white" style={{ fontSize: 10, fontFamily: 'Sora_700Bold', letterSpacing: 0.5 }}>
                          {label}
                        </Text>
                      </View>
                    </View>
                    <Text variant="caption" className="mt-1 text-center">
                      {format(photo.takenAt, 'MMM d, yyyy')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingHorizontal: pad }}>
                <View style={{ width: innerW, height: sliderH, borderRadius: 16, overflow: 'hidden' }}>
                  <Image source={{ uri: after!.uri }} style={{ position: 'absolute', width: innerW, height: sliderH }} />
                  <View style={{ position: 'absolute', left: 0, top: 0, width: innerW * reveal, height: sliderH, overflow: 'hidden' }}>
                    <Image source={{ uri: before!.uri }} style={{ width: innerW, height: sliderH }} />
                  </View>
                  <View style={{ position: 'absolute', left: innerW * reveal - 1, top: 0, width: 2, height: sliderH, backgroundColor: '#ffffff' }} />
                  <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text className="text-white" style={{ fontSize: 10, fontFamily: 'Sora_700Bold' }}>BEFORE</Text>
                  </View>
                  <View style={{ position: 'absolute', right: 8, top: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text className="text-white" style={{ fontSize: 10, fontFamily: 'Sora_700Bold' }}>AFTER</Text>
                  </View>
                </View>
              </View>
            )
          ) : (
            <View style={{ marginHorizontal: pad, height: splitH, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors[scheme].border, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <GitCompareArrows size={24} color={colors[scheme].mutedForeground} />
              <Text variant="muted">Pick a {active} photo below</Text>
            </View>
          )}

          {/* Caption + watermark footer */}
          <View style={{ padding: pad, gap: 8 }}>
            {caption.trim().length > 0 && <Text className="text-foreground">{caption.trim()}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Sparkles size={12} color={COMPARE_TINT} />
              <Text style={{ color: colors[scheme].mutedForeground, fontSize: 11, fontFamily: 'Sora_600SemiBold' }}>Tracked with LifeOS</Text>
            </View>
          </View>
        </View>

        {/* Controls (not part of the captured card) */}
        <Segmented options={LAYOUT_OPTIONS} value={layout} onChange={setLayout} activeColor={COMPARE_TINT} />

        {ready && layout === 'slider' && (
          <Slider
            value={reveal}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={COMPARE_TINT}
            maximumTrackTintColor={colors[scheme].border}
            thumbTintColor={COMPARE_TINT}
            onValueChange={setReveal}
          />
        )}

        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Add a caption to your progress…"
          placeholderTextColor={colors[scheme].mutedForeground}
          className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
          maxLength={140}
        />

        {ready && (
          <View className="gap-2.5">
            <GradientButton label={saving ? 'Saving…' : 'Save to feed'} tint={COMPARE_TINT} icon={Bookmark} onPress={saveToFeed} disabled={saving || sharing} />
            <Pressable
              onPress={share}
              disabled={sharing || saving}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-border py-3.5"
              style={{ opacity: sharing || saving ? 0.6 : 1 }}
            >
              <Share2 size={17} color={COMPARE_TINT} />
              <Text className="font-sora-semibold" style={{ color: COMPARE_TINT }}>
                {sharing ? 'Preparing…' : 'Share image'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Slot chips */}
        <View className="flex-row gap-3">
          {(['before', 'after'] as const).map((slot) => {
            const photo = slot === 'before' ? before : after;
            const isActive = active === slot;
            return (
              <Pressable
                key={slot}
                onPress={() => setActive(slot)}
                className="flex-1 items-center gap-1 rounded-2xl border p-2"
                style={isActive ? { borderColor: COMPARE_TINT, borderWidth: 2 } : { borderColor: colors[scheme].border }}
              >
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 80, borderRadius: 10 }} />
                ) : (
                  <View className="h-20 w-full items-center justify-center rounded-lg bg-surface">
                    <Text variant="caption">Pick photo</Text>
                  </View>
                )}
                <Text className="font-sora-semibold capitalize text-foreground">{slot}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Photo picker strip */}
        <View className="gap-2">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Tap to set “{active}”
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {stills.map((photo) => {
              const selected = photo.id === beforeId || photo.id === afterId;
              const tile = (Dimensions.get('window').width - 32 - 4 * 3) / 4;
              return (
                <Pressable key={photo.id} onPress={() => assign(photo.id)} style={{ width: tile, height: tile }}>
                  <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%', borderRadius: 8, opacity: selected ? 0.4 : 1 }} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({
  insets,
  scheme,
  onBack,
}: {
  insets: { top: number };
  scheme: 'light' | 'dark';
  onBack: () => void;
}) {
  return (
    <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-1 px-4 pb-2">
      <Pressable onPress={onBack} hitSlop={8} className="-ml-1 p-1" accessibilityLabel="Back">
        <ChevronLeft size={24} color={colors[scheme].foreground} />
      </Pressable>
      <Text variant="heading">Before & After</Text>
    </View>
  );
}
