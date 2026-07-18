import { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/ui/gradient-button';
import { StarRating } from '@/components/ui/star-rating';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { formatStudyDuration } from '@/features/study/services/study-stats';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STUDY_TINT = '#8b5cf6';

type Props = {
  visible: boolean;
  focusSeconds: number;
  onSave: (focusRating: number | null, note: string) => void;
};

/** Post-session reflection: celebrate the focused time, then capture an
 * optional focus rating + note so the user can track and improve quality over
 * time. Dismissing still saves the session (study time is never lost). */
export function ReflectionSheet({ visible, focusSeconds, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const commit = () => {
    onSave(rating, note.trim());
    setRating(null);
    setNote('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={commit} statusBarTranslucent>
      <Pressable className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={commit}>
        <View className="flex-1 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} style={{ paddingBottom: insets.bottom + 14 }} className="gap-4 rounded-t-3xl bg-card px-5 pt-3">
            <View className="mb-1 h-1 w-10 self-center rounded-full" style={{ backgroundColor: colors[scheme].border }} />

            <View className="items-center gap-1">
              <Text variant="heading">Nice work! 🎉</Text>
              <Text variant="muted">
                You focused for <Text className="font-sora-bold" style={{ color: STUDY_TINT }}>{formatStudyDuration(focusSeconds)}</Text>
              </Text>
            </View>

            <View className="items-center gap-2">
              <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                How focused were you?
              </Text>
              <StarRating value={rating} onChange={setRating} />
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="What did you work on? (optional)"
              placeholderTextColor={colors[scheme].mutedForeground}
              className="rounded-2xl border border-border px-4 py-3 text-foreground"
            />

            <GradientButton label="Save session" tint={STUDY_TINT} onPress={commit} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
