import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Mic, Square } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, useColorScheme } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

type Props = {
  onRecorded: (uri: string, durationMs: number) => void;
};

export function VoiceNoteRecorder({ onRecorded }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const startedAt = useRef(0);

  useEffect(() => {
    requestRecordingPermissionsAsync();
  }, []);

  const start = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
  };

  const stop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await recorder.stop();
    if (recorder.uri) onRecorded(recorder.uri, Date.now() - startedAt.current);
  };

  return (
    <Pressable
      onPress={state.isRecording ? stop : start}
      className="flex-row items-center gap-2 rounded-full border border-border px-3 py-2"
    >
      {state.isRecording ? (
        <Square size={14} color={colors[scheme].destructive} fill={colors[scheme].destructive} />
      ) : (
        <Mic size={16} color={colors[scheme].mutedForeground} />
      )}
      <Text variant="caption" className="font-sora-medium">
        {state.isRecording ? 'Stop recording' : 'Voice note'}
      </Text>
    </Pressable>
  );
}
