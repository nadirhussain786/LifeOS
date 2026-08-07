import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { PinPad } from '@/features/private/components/pin-pad';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { MIN_PIN_LENGTH, isVaultSetUp, unlockVault } from '@/features/private/services/vault-keys';
import { usePrivateStore } from '@/features/private/store/private-store';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { reportError } from '@/lib/error-reporting';

/**
 * The door.
 *
 * Two things it deliberately does not do. It never says "wrong PIN, but this
 * one would have opened the decoy" — the two spaces are indistinguishable from
 * here, which is the only way a decoy is worth having. And it never offers a
 * recovery link: there is no recovery, because a way to reset the PIN without
 * the PIN is a way in.
 *
 * ## Why this screen has no chrome
 *
 * It used to be the app's standard shell: header, heading, a card, and two
 * buttons in a footer — the same construction as the budget screen. That made
 * the most consequential moment in LifeOS look like a form.
 *
 * Everything here is gone except the light. There is no header, no card, no
 * primary button; the keypad *is* the interface, and entering the last digit is
 * what opens the door rather than a separate confirming tap. The ring breathes
 * because a still screen with no controls reads as broken, and one slow moving
 * thing reads as waiting.
 *
 * The no-recovery warning lives down here rather than in a dialog, because this
 * is the moment somebody is deciding whether to trust the space with something,
 * and a warning acknowledged once at setup is a warning nobody remembers.
 */

const VAULT_TINT = '#7c6cf0';

export default function PrivateUnlockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vault = useVaultTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const unlock = usePrivateStore((s) => s.unlock);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryInMs, setRetryInMs] = useState(0);

  const breath = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    breath.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.95, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [breath, reducedMotion]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
    opacity: 0.35 + (breath.value - 0.95) * 2,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  useEffect(() => {
    void isVaultSetUp().then((ready) => {
      if (!ready) router.replace('/private/setup');
    });
  }, [router]);

  /** A wrong PIN moves the ring, not the layout. A shifting error line would
   *  push the keypad down mid-tap, which is how the next attempt goes wrong too. */
  const refuse = useCallback(() => {
    if (reducedMotion) return;
    shake.value = withSequence(
      withTiming(-7, { duration: 55 }),
      withTiming(7, { duration: 55 }),
      withTiming(-4, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
  }, [shake, reducedMotion]);

  const submit = useCallback(
    async (candidate: string) => {
      if (candidate.length < MIN_PIN_LENGTH || busy) return;
      setBusy(true);
      setError(null);

      // try/finally: unlocking is seconds of PBKDF2 with every control
      // disabled, so a throw here is indistinguishable from a hang.
      try {
        const result = await unlockVault(candidate);
        setPin('');

        if (result.ok) {
          unlock(result.key, result.space);
          router.replace('/private');
          return;
        }

        if (result.reason === 'throttled') {
          setRetryInMs(result.retryInMs ?? 0);
          setError(t('private.throttled', { minutes: Math.ceil((result.retryInMs ?? 0) / 60000) }));
          refuse();
          return;
        }
        if (result.reason === 'not-set-up') {
          router.replace('/private/setup');
          return;
        }
        setError(t('private.wrongPin'));
        refuse();
      } catch (cause) {
        // Never reported as a wrong PIN. Telling somebody their correct PIN is
        // wrong is how they conclude the data is gone and stop trying.
        reportError(cause, { screen: 'private/unlock' });
        setPin('');
        setError(t('private.unlockFailed'));
      } finally {
        setBusy(false);
      }
    },
    [busy, unlock, router, t, refuse],
  );

  // Counts the throttle down so the pad re-enables on its own rather than
  // leaving somebody tapping a dead screen.
  useEffect(() => {
    if (retryInMs <= 0) return;
    const timer = setInterval(() => {
      setRetryInMs((ms) => {
        const next = ms - 1000;
        if (next <= 0) {
          setError(null);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryInMs]);

  const blocked = busy || retryInMs > 0;

  /** Entering the final digit opens the door. A "Unlock" button after a full
   *  PIN is a tap that exists only to be tapped. */
  const onChange = (next: string) => {
    setError(null);
    setPin(next);
    if (next.length === MIN_PIN_LENGTH) void submit(next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: vault.void }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
          paddingHorizontal: 28,
          gap: 30,
        }}
      >
        {/* The light. Everything else on this screen is unlit. */}
        <Animated.View style={ringStyle}>
          <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 132,
                  height: 132,
                  borderRadius: 66,
                  backgroundColor: tinted(VAULT_TINT, 0.1),
                },
                haloStyle,
              ]}
            />
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                borderWidth: 1,
                borderColor: tinted(VAULT_TINT, busy ? 0.75 : 0.4),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Keyhole tint={VAULT_TINT} />
            </View>
          </View>
        </Animated.View>

        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text className="font-sora-semibold text-lg" style={{ color: vault.ink }}>
            {busy ? t('private.unlocking') : t('private.unlockTitle')}
          </Text>
          {/* Reserved height: the message appears and disappears without ever
              moving the keypad under somebody's thumb. */}
          <View style={{ minHeight: 34, justifyContent: 'center' }}>
            {error ? (
              <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(160)}>
                <Text
                  className="text-center text-xs"
                  style={{ color: vault.alarm, maxWidth: 260, lineHeight: 17 }}
                >
                  {error}
                </Text>
              </Animated.View>
            ) : (
              <Text className="text-center text-xs" style={{ color: vault.faint, maxWidth: 260 }}>
                {t('private.unlockBody')}
              </Text>
            )}
          </View>
        </View>

        <PinPad
          value={pin}
          onChange={onChange}
          disabled={blocked}
          dotCount={MIN_PIN_LENGTH}
          tint={VAULT_TINT}
        />
      </View>

      <View
        style={{
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 20,
          alignItems: 'center',
          gap: 18,
        }}
      >
        {/* Stated here, quietly, every time — not once at setup. */}
        <Text
          className="text-center text-[11px]"
          style={{ color: vault.faint, lineHeight: 16, maxWidth: 280 }}
        >
          {t('private.noRecoveryWarning')}
        </Text>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          hitSlop={12}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text className="font-sora-medium text-sm" style={{ color: vault.mute }}>
            {t('common.cancel')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Drawn rather than imported: no icon in the set reads as a keyhole at this
 *  size, and this is the one glyph the screen is built around. */
function Keyhole({ tint }: { tint: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 15,
          height: 15,
          borderRadius: 8,
          borderWidth: 1.6,
          borderColor: tint,
        }}
      />
      <View style={{ width: 1.6, height: 10, backgroundColor: tint, marginTop: -1 }} />
    </View>
  );
}
