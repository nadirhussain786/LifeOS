import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Pause, Play, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

export type AttachmentPreview = {
  id: string;
  kind: 'image' | 'audio' | 'pdf' | 'file';
  uri: string;
  durationMs: number | null;
};

type Props = {
  attachments: AttachmentPreview[];
  onAddImage: (uri: string) => void;
  onRemove: (id: string) => void;
};

function formatDuration(ms: number | null) {
  if (!ms) return '0:00';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function AudioAttachmentTile({ uri, durationMs }: { uri: string; durationMs: number | null }) {
  const scheme = useColorScheme() ?? 'light';
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    Haptics.selectionAsync();
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish || status.currentTime >= status.duration) player.seekTo(0);
      player.play();
    }
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
      className="h-20 w-20 items-center justify-center gap-1 rounded-xl border border-border bg-muted"
    >
      {status.playing ? (
        <Pause size={18} color={colors[scheme].accent} fill={colors[scheme].accent} />
      ) : (
        <Play size={18} color={colors[scheme].mutedForeground} />
      )}
      <Text variant="caption">{formatDuration(durationMs)}</Text>
    </Pressable>
  );
}

export function AttachmentStrip({ attachments, onAddImage, onRemove }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAddImage(result.assets[0].uri);
    }
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-3">
        {attachments.map((attachment) => (
          <View key={attachment.id} className="relative">
            {attachment.kind === 'image' ? (
              <Pressable onPress={() => setViewerUri(attachment.uri)} accessibilityLabel="View photo">
                <Image source={{ uri: attachment.uri }} className="h-20 w-20 rounded-xl" />
              </Pressable>
            ) : (
              <AudioAttachmentTile uri={attachment.uri} durationMs={attachment.durationMs} />
            )}
            <Pressable
              onPress={() => onRemove(attachment.id)}
              hitSlop={8}
              accessibilityLabel="Remove attachment"
              className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-destructive"
            >
              <Trash2 size={12} color={colors[scheme].primaryForeground} />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={pickImage}
          className="h-20 w-20 items-center justify-center gap-1 rounded-xl border border-dashed border-border"
        >
          <ImagePlus size={18} color={colors[scheme].mutedForeground} />
          <Text variant="caption">Photo</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <View className="flex-1 bg-black/95">
          <Pressable
            onPress={() => setViewerUri(null)}
            hitSlop={10}
            accessibilityLabel="Close"
            style={{ top: insets.top + 12 }}
            className="absolute right-5 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} color="#ffffff" />
          </Pressable>
          <Pressable className="flex-1 items-center justify-center" onPress={() => setViewerUri(null)}>
            {viewerUri && <Image source={{ uri: viewerUri }} className="h-full w-full" resizeMode="contain" />}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
