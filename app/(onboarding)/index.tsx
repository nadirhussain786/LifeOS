import { useRouter } from 'expo-router';
import { Leaf, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardClass } from '@/components/ui/card';
import { ArrowBack } from '@/components/ui/directional-icon';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { FOCUS_AREAS, GENDER_OPTIONS, focusTint } from '@/features/profile/constants';
import type { FocusArea, Gender } from '@/features/profile/store/profile-store';
import { useProfileStore } from '@/features/profile/store/profile-store';
import {
  authenticate,
  getBiometricLabel,
  isBiometricAvailable,
} from '@/features/security/lib/biometrics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { alpha } from '@/lib/color';

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
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
    completeOnboarding({ name, gender, focusAreas: focus, appLockEnabled });
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
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep((s) => s - 1)}
            hitSlop={10}
            className="absolute start-5"
            accessibilityLabel={t('common.back')}
          >
            <ArrowBack size={22} color={colors[scheme].foreground} />
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

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          key={step}
          entering={reducedMotion ? undefined : FadeIn.duration(260)}
          className="flex-1 px-6"
        >
          {step === 0 ? (
            <View className="flex-1 justify-center gap-6">
              <View
                className="h-20 w-20 items-center justify-center rounded-3xl"
                style={{ backgroundColor: colors[scheme].accent }}
              >
                <Leaf size={38} color="#ffffff" strokeWidth={2} />
              </View>
              <View className="gap-3">
                <Text className="font-sora-extrabold text-4xl tracking-tight text-foreground">
                  {t('onboarding.welcomeTitle')}
                </Text>
                <Text className="text-muted-foreground" style={{ fontSize: 17, lineHeight: 26 }}>
                  {t('onboarding.welcomeBody')}
                </Text>
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View className="flex-1 gap-6 pt-8">
              <View className="gap-2">
                <Text variant="micro">{t('onboarding.aboutYou')}</Text>
                <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">
                  {t('onboarding.whatToCallYou')}
                </Text>
                <Text variant="muted">{t('onboarding.nameHint')}</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                accessibilityLabel={t('onboarding.yourName')}
                placeholder={t('onboarding.yourName')}
                placeholderTextColor={colors[scheme].mutedForeground}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => name.trim() && setStep(2)}
                className={cardClass({ padding: 'none' }, 'px-4 py-4 text-lg text-foreground')}
                style={{ fontFamily: 'Sora_400Regular' }}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View className="flex-1 gap-5 pt-8">
              <View className="gap-2">
                <Text variant="micro">{t('onboarding.aboutYou')}</Text>
                <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">
                  {t('onboarding.genderQuestion')}
                </Text>
                {/* Says what it is for, because an app asking this without a
                    reason is an app people close. */}
                <Text variant="muted">{t('onboarding.genderWhy')}</Text>
              </View>
              <View className="gap-2.5">
                {GENDER_OPTIONS.map((option) => {
                  const selected = gender === option.id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      key={option.id}
                      onPress={() => setGender(selected ? null : option.id)}
                      className="flex-row items-center justify-between rounded-2xl border px-4 py-4"
                      style={{
                        borderColor: selected ? colors[scheme].accent : colors[scheme].border,
                        backgroundColor: selected
                          ? alpha(colors[scheme].accent, 0.12)
                          : 'transparent',
                      }}
                    >
                      <Text
                        className="font-sora-medium"
                        style={{
                          color: selected ? colors[scheme].accent : colors[scheme].foreground,
                        }}
                      >
                        {t(option.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View className="flex-1 gap-5 pt-8">
              <View className="gap-2">
                <Text variant="micro">{t('dashboard.yourFocus')}</Text>
                <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">
                  {t('onboarding.whatMatters')}
                </Text>
                <Text variant="muted">{t('onboarding.pickAFew')}</Text>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="flex-row flex-wrap gap-2.5 pb-4"
              >
                {FOCUS_AREAS.map((area) => {
                  const selected = focus.includes(area.id);
                  const tint = focusTint(area.module, scheme);
                  const Icon = area.icon;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={area.id}
                      onPress={() => toggleFocus(area.id)}
                      className="flex-row items-center gap-2 rounded-full border px-4 py-2.5"
                      style={{
                        borderColor: selected ? tint : colors[scheme].border,
                        backgroundColor: selected ? alpha(tint, 0.14) : 'transparent',
                      }}
                    >
                      <Icon size={17} color={selected ? tint : colors[scheme].mutedForeground} />
                      <Text
                        className="font-sora-medium"
                        style={{ color: selected ? tint : colors[scheme].foreground }}
                      >
                        {t(area.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {step === 4 ? (
            <View className="flex-1 justify-center gap-6">
              <View className="h-20 w-20 items-center justify-center rounded-3xl bg-surface">
                <ShieldCheck size={36} color={colors[scheme].accent} strokeWidth={1.8} />
              </View>
              <View className="gap-3">
                <Text className="font-sora-extrabold text-3xl tracking-tight text-foreground">
                  {t('onboarding.keepPrivate')}
                </Text>
                <Text className="text-muted-foreground" style={{ fontSize: 17, lineHeight: 26 }}>
                  {bioAvailable
                    ? t('onboarding.lockBody', { method: bioLabel })
                    : t('onboarding.noBiometrics')}
                </Text>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* footer — one primary action per step */}
      <View className="gap-3 px-6" style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}>
        {step === 0 ? (
          <Button
            variant="accent"
            size="lg"
            label={t('onboarding.getStarted')}
            onPress={() => setStep(1)}
          />
        ) : null}
        {step === 1 ? (
          <Button
            variant="accent"
            size="lg"
            label={t('common.continue')}
            disabled={!name.trim()}
            onPress={() => setStep(2)}
          />
        ) : null}
        {step === 2 ? (
          <Button
            variant="accent"
            size="lg"
            label={gender ? t('common.continue') : t('onboarding.skipForNow')}
            onPress={() => setStep(3)}
          />
        ) : null}
        {step === 3 ? (
          <Button
            variant="accent"
            size="lg"
            label={focus.length ? t('common.continue') : t('onboarding.skipForNow')}
            onPress={() => setStep(4)}
          />
        ) : null}
        {step === 4 ? (
          bioAvailable ? (
            <>
              <Button
                variant="accent"
                size="lg"
                label={t('onboarding.enableMethod', { method: bioLabel })}
                onPress={enableLock}
              />
              <Button
                variant="ghost"
                size="lg"
                label={t('onboarding.notNow')}
                onPress={() => finish(false)}
              />
            </>
          ) : (
            <Button
              variant="accent"
              size="lg"
              label={t('onboarding.finishSetup')}
              onPress={() => finish(false)}
            />
          )
        ) : null}
      </View>
    </View>
  );
}
