import { Camera, ImagePlus, Video, X, type LucideIcon } from 'lucide-react-native';
import { Alert, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { PermissionDeniedError, useGalleryMutations } from '@/features/gallery/hooks/use-gallery-mutations';
import { MAX_VIDEO_MB, type MediaKind, type MediaSource } from '@/features/gallery/services/gallery-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Album these captures are filed under (null = unfiled / All Photos). */
  albumId: string | null;
};

type Option = { key: string; label: string; hint: string; icon: LucideIcon; tint: string; source: MediaSource; mediaTypes: MediaKind[] };

const OPTIONS: Option[] = [
  { key: 'photo', label: 'Take Photo', hint: 'Capture a new progress shot', icon: Camera, tint: '#0ea5e9', source: 'camera', mediaTypes: ['images'] },
  { key: 'video', label: 'Record Video', hint: `Up to 60s · ${MAX_VIDEO_MB}MB`, icon: Video, tint: '#8b5cf6', source: 'camera', mediaTypes: ['videos'] },
  { key: 'library', label: 'Choose from Library', hint: 'Photos & videos', icon: ImagePlus, tint: '#ec4899', source: 'library', mediaTypes: ['images', 'videos'] },
];

/** Bottom-sheet menu for adding progress media — three big source options
 * (take photo, record video, import). Owns the whole import flow: permission
 * prompts, and the "skipped an oversized video" notice. */
export function AddMediaSheet({ visible, onClose, albumId }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { importMedia } = useGalleryMutations();

  const run = (option: Option) => {
    onClose();
    importMedia.mutate(
      { albumId, source: option.source, mediaTypes: option.mediaTypes },
      {
        onSuccess: (result) => {
          if (result.rejectedOversize > 0) {
            const n = result.rejectedOversize;
            Alert.alert(
              'Video too large',
              `${n} video${n === 1 ? '' : 's'} skipped for being over ${MAX_VIDEO_MB}MB. Trim it or record a shorter clip and try again.`,
            );
          }
        },
        onError: (error) => {
          if (error instanceof PermissionDeniedError) {
            Alert.alert(
              option.source === 'camera' ? 'Camera access needed' : 'Photo access needed',
              `Allow ${option.source === 'camera' ? 'camera' : 'photo library'} access in Settings to add progress media.`,
            );
          }
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ paddingBottom: insets.bottom + 12 }}
            className="gap-2 rounded-t-3xl bg-card px-5 pt-3"
          >
            <View className="mb-1 h-1 w-10 self-center rounded-full" style={{ backgroundColor: colors[scheme].border }} />
            <View className="flex-row items-center justify-between pb-1">
              <Text variant="subheading">Add to your progress</Text>
              <Pressable onPress={onClose} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
                <X size={16} color={colors[scheme].foreground} />
              </Pressable>
            </View>

            {OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => run(option)}
                  className="flex-row items-center gap-3.5 rounded-2xl border border-border p-3.5"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: alpha(option.tint, 0.14) }}>
                    <Icon size={21} color={option.tint} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sora-semibold text-foreground">{option.label}</Text>
                    <Text variant="caption">{option.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
