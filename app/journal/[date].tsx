import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Clock3, MapPin, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttachmentStrip } from '@/components/ui/attachment-strip';
import { Text } from '@/components/ui/text';
import { VoiceNoteRecorder } from '@/components/ui/voice-note-recorder';
import { colors } from '@/constants/theme';
import { MoodCheckin } from '@/features/journal/components/mood-checkin';
import { ReflectionPromptList } from '@/features/journal/components/reflection-prompt-list';
import { MOOD_TINT } from '@/features/journal/constants';
import {
  useJournalAttachments,
  useJournalEntry,
  useJournalPrompts,
  useJournalReflections,
} from '@/features/journal/hooks/use-journal-entry';
import { useJournalMutations } from '@/features/journal/hooks/use-journal-mutations';
import type { MoodOption } from '@/features/journal/types/journal.types';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

const AUTOSAVE_DELAY_MS = 500;

export default function JournalEntryScreen() {
  const { date: entryDate } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const keyboardHeight = useKeyboardHeight();

  const { data: entry } = useJournalEntry(entryDate);
  const { data: prompts = [] } = useJournalPrompts();
  const { data: reflections = [] } = useJournalReflections(entry?.id ?? null);
  const { data: attachments = [] } = useJournalAttachments(entry?.id ?? null);
  const { upsert, remove, answerPrompt, attach, removeAttachment } = useJournalMutations();

  const [body, setBody] = useState('');

  useEffect(() => {
    // A journal entry always exists once its screen is opened, so reflections
    // and reference chips always have a stable entryId to attach to.
    if (!entry) upsert.mutate({ entryDate });
  }, [entry, entryDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setBody(entry?.body ?? '');
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entry || body === entry.body) return;
    const timeout = setTimeout(() => upsert.mutate({ entryDate, body }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) return null;

  const wash = entry.mood ? `${MOOD_TINT[entry.mood]}33` : `${colors[scheme].accent}1a`;

  const toggleReason = (reason: string) => {
    const current = new Set(entry.moodReasons ?? []);
    if (current.has(reason)) current.delete(reason);
    else current.add(reason);
    upsert.mutate({ entryDate, moodReasons: [...current] });
  };

  const tagLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return;

    const position = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync(position.coords).catch(() => []);
    const label = place ? [place.city, place.region].filter(Boolean).join(', ') : 'Current location';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    upsert.mutate({
      entryDate,
      locationLabel: label,
      locationLat: position.coords.latitude,
      locationLng: position.coords.longitude,
    });
  };

  const date = parseISO(entryDate);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* A soft mood-tinted wash behind the header, reacting live to whichever mood is picked below —
          the page itself reflects how the day felt, rather than staying neutral chrome regardless. */}
      <LinearGradient colors={[wash, 'transparent']} style={[StyleSheet.absoluteFillObject, { height: 240 }]} />

      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>
        <Pressable
          onPress={() => {
            remove.mutate(entry.id);
            router.back();
          }}
          hitSlop={8}
        >
          <Trash2 size={19} color={colors[scheme].destructive} />
        </Pressable>
      </View>

      <View className="gap-1 px-5 pb-5">
        <View className="flex-row items-center justify-between">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            {format(date, 'EEEE')}
          </Text>
          <Pressable
            onPress={() => router.push(`/timeline/${entryDate}`)}
            className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1"
          >
            <Clock3 size={12} color={colors[scheme].mutedForeground} />
            <Text variant="caption" className="font-sora-medium">
              Day timeline
            </Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 32, lineHeight: 40, fontFamily: 'Literata_600SemiBold' }} className="text-foreground">
          {format(date, 'MMMM d')}
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-1"
        contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MoodCheckin
          mood={entry.mood}
          energy={entry.energy}
          stress={entry.stress}
          focus={entry.focus}
          sleepHours={entry.sleepHours}
          sleepQuality={entry.sleepQuality}
          moodReasons={entry.moodReasons}
          onChangeMood={(mood: MoodOption) => upsert.mutate({ entryDate, mood })}
          onChangeEnergy={(energy) => upsert.mutate({ entryDate, energy })}
          onChangeStress={(stress) => upsert.mutate({ entryDate, stress })}
          onChangeFocus={(focus) => upsert.mutate({ entryDate, focus })}
          onChangeSleepHours={(sleepHours) => upsert.mutate({ entryDate, sleepHours })}
          onChangeSleepQuality={(sleepQuality) => upsert.mutate({ entryDate, sleepQuality })}
          onToggleReason={toggleReason}
        />

        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="How was today?"
          placeholderTextColor={colors[scheme].mutedForeground}
          style={{ fontFamily: 'Literata_400Regular', fontSize: 17, lineHeight: 25 }}
          className="min-h-32 rounded-2xl border border-border bg-card p-4 text-foreground"
          textAlignVertical="top"
        />

        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            onPress={tagLocation}
            className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-2"
          >
            <MapPin size={14} color={colors[scheme].mutedForeground} />
            <Text variant="caption" className="font-sora-medium">
              {entry.locationLabel ?? 'Tag location'}
            </Text>
          </Pressable>

          <VoiceNoteRecorder
            onRecorded={(uri, durationMs) => attach.mutate({ entryId: entry.id, kind: 'audio', uri, durationMs })}
          />
        </View>

        <AttachmentStrip
          attachments={attachments}
          onAddImage={(uri) => attach.mutate({ entryId: entry.id, kind: 'image', uri })}
          onRemove={(id) => removeAttachment.mutate({ id, entryId: entry.id })}
        />

        <ReflectionPromptList
          prompts={prompts}
          reflections={reflections}
          onAnswer={(promptId, text) => answerPrompt.mutate({ entryId: entry.id, promptId, answerText: text })}
        />
      </ScrollView>
    </View>
  );
}
