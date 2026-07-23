import { useRouter } from 'expo-router';
import { ArrowLeft, Leaf, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { FOCUS_AREAS, focusTint } from '@/features/profile/constants';
import type { FocusArea } from '@/features/profile/store/profile-store';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { authenticate, getBiometricLabel, isBiometricAvailable } from '@/features/security/lib/biometrics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [focus, setFocus] = useState<FocusArea[]>([]);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    getBiometricLabel().then(setBioLabel);
  }, []);

  const toggleFocus = (id: FocusArea) =>
    setFocus((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const finish = (appLockEnabled: boolean) => {
    completeOnboarding({ name, focusAreas: focus, appLockEnabled });
    router.replace('/(tabs)');
  };

  const enableLock = async () => {
    const ok = await authenticate(`Confirm ${bioLabel}`);
    if (ok) finish(true);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* progress + back */}
      <View className="h-12 flex-row items-center justify-center px-5">
        {step > 0 ? (
          <Pressable onPress={() => setStep((s) => s - 1)} hitSlop={10} className="absolute left-5" accessibilityLabel="Back">
            <ArrowLeft size={22} color={colors[scheme].foreground} />
          </Pressable>
        ) : null}
        <View className="flex-row gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              className="h-1.5 rounded-full"
              style={{
                width: i === step ? 22 : 6,
                backgroundColor: i <= step ? colors[scheme].accent : colors[scheme].border,
              }}
            />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View key={step} entering={FadeIn.duration(260)} className="flex-1 px-6">
          {step === 0 ? (
            <View className="flex-1 justify-center gap-6">
              <View className="h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: colors[scheme].accent }}>
                <Leaf size={38} color="#ffffff" strokeWidth={2} />
              </View>
              <View className="gap-3">
                <Text className="font-sora-extrabold text-4xl tracking-tight text-foreground">Welcome to LifeOS</Text>
                <Text className="text-muted-foreground" style={{ fontSize: 17, lineHeight: 26 }}>
                  A calm, private home for your habits, tasks, journal, and everything you&rsquo;re working toward. Let&rsquo;s set it up in a few taps.
                </Text>
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View className="flex-1 gap-6 pt-8">
              <View className="gap-2">
                <Text variant="micro">About you</Text>
                <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">What should we call you?</Text>
                <Text variant="muted">We&rsquo;ll use it to greet you — nothing leaves your device.</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors[scheme].mutedForeground}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => name.trim() && setStep(2)}
                className="rounded-2xl border border-border bg-card px-4 py-4 text-lg text-foreground"
                style={{ fontFamily: 'Sora_400Regular' }}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View className="flex-1 gap-5 pt-8">
              <View className="gap-2">
                <Text variant="micro">Your focus</Text>
                <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">What matters most right now?</Text>
                <Text variant="muted">Pick a few. You can always change what you track later.</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="flex-row flex-wrap gap-2.5 pb-4">
                {FOCUS_AREAS.map((area) => {
                  const selected = focus.includes(area.id);
                  const tint = focusTint(area.module, scheme);
                  const Icon = area.icon;
                  return (
                    <Pressable
                      key={area.id}
                      onPress={() => toggleFocus(area.id)}
                      className="flex-row items-center gap-2 rounded-full border px-4 py-2.5"
                      style={{
                        borderColor: selected ? tint : colors[scheme].border,
                        backgroundColor: selected ? alpha(tint, 0.14) : 'transparent',
                      }}
                    >
                      <Icon size={17} color={selected ? tint : colors[scheme].mutedForeground} />
                      <Text className="font-sora-medium" style={{ color: selected ? tint : colors[scheme].foreground }}>
                        {area.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {step === 3 ? (
            <View className="flex-1 justify-center gap-6">
              <View className="h-20 w-20 items-center justify-center rounded-3xl bg-surface">
                <ShieldCheck size={36} color={colors[scheme].accent} strokeWidth={1.8} />
              </View>
              <View className="gap-3">
                <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">Keep LifeOS private?</Text>
                <Text className="text-muted-foreground" style={{ fontSize: 17, lineHeight: 26 }}>
                  {bioAvailable
                    ? `Lock the app with ${bioLabel} so only you can open it. It's optional — you can turn it on or off anytime in Settings.`
                    : "Biometric lock isn't set up on this device. You can enable it later from Settings once you've added Face ID or a fingerprint."}
                </Text>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* footer — one primary action per step */}
      <View className="gap-3 px-6" style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}>
        {step === 0 ? <Button variant="accent" size="lg" label="Get started" onPress={() => setStep(1)} /> : null}
        {step === 1 ? (
          <Button variant="accent" size="lg" label="Continue" disabled={!name.trim()} onPress={() => setStep(2)} />
        ) : null}
        {step === 2 ? (
          <Button variant="accent" size="lg" label={focus.length ? 'Continue' : 'Skip for now'} onPress={() => setStep(3)} />
        ) : null}
        {step === 3 ? (
          bioAvailable ? (
            <>
              <Button variant="accent" size="lg" label={`Enable ${bioLabel}`} onPress={enableLock} />
              <Button variant="ghost" size="lg" label="Not now" onPress={() => finish(false)} />
            </>
          ) : (
            <Button variant="accent" size="lg" label="Finish setup" onPress={() => finish(false)} />
          )
        ) : null}
      </View>
    </View>
  );
}
