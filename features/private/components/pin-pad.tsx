import * as Haptics from 'expo-haptics';
import { Delete } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * The private space's keypad.
 *
 * Its own component rather than a TextInput, for two reasons that both matter
 * here: a numeric keypad cannot be intercepted by a third-party keyboard (which
 * on Android can be a keylogger with the user's blessing), and there is no text
 * field for the OS to offer to autofill, remember, or sync to another device.
 *
 * The filled-dot row shows length only. No "last digit visible" reveal — the
 * threat model for this screen includes somebody standing behind you.
 *
 * ## On the ground it draws itself against
 *
 * It reads the vault palette rather than the app theme, because it only ever
 * appears inside the private space. A keypad rendered on the app's white
 * background was the single loudest signal that the vault was just another
 * screen; here the digits are the brightest thing on near-black, and a filled
 * dot glows with the module tint rather than the brand accent.
 */
type Props = {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  disabled?: boolean;
  /** Dots to draw. Above this the row switches to a count, so a long
   * passphrase does not overflow the screen. */
  dotCount: number;
  /** The light this pad is lit by. Defaults to the vault module's violet. */
  tint?: string;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

export function PinPad({
  value,
  onChange,
  maxLength = 32,
  disabled = false,
  dotCount,
  tint = '#7c6cf0',
}: Props) {
  const vault = useVaultTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const press = (key: string) => {
    if (disabled) return;
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (key === 'delete') onChange(value.slice(0, -1));
    else if (value.length < maxLength) onChange(value + key);
  };

  const dots = Math.min(dotCount, 12);

  return (
    <View className="items-center gap-9">
      <View className="h-6 flex-row items-center gap-4">
        {value.length > 12 ? (
          <Text className="text-sm" style={{ color: vault.mute }}>
            {t('private.digitsEntered', { count: value.length })}
          </Text>
        ) : (
          Array.from({ length: Math.max(dots, value.length) }).map((_, index) => {
            const filled = index < value.length;
            return (
              <Animated.View
                key={index}
                // Each digit lands rather than appears. The only feedback the
                // pad gives, since there is no character to read back.
                entering={reducedMotion || !filled ? undefined : FadeIn.duration(120)}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 6,
                  backgroundColor: filled ? tint : 'transparent',
                  borderWidth: filled ? 0 : 1,
                  borderColor: tinted(tint, 0.3),
                  // The glow is what makes the row read as light rather than
                  // as filled shapes — and it is the only lit thing on screen.
                  shadowColor: tint,
                  shadowOpacity: filled ? 0.9 : 0,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: filled ? 6 : 0,
                }}
              />
            );
          })
        )}
      </View>

      <View className="w-full max-w-[288px] flex-row flex-wrap justify-between gap-y-2">
        {KEYS.map((key, index) =>
          key === '' ? (
            <View key={`spacer-${index}`} className="h-[68px] w-[30%]" />
          ) : (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'delete' ? t('common.delete') : key}
              onPress={() => press(key)}
              disabled={disabled}
              className="h-[68px] w-[30%] items-center justify-center rounded-full"
              style={({ pressed }) => ({
                // Pressed state is a pool of the tint, not a grey fill: on this
                // ground a grey highlight reads as a rendering artefact.
                backgroundColor: pressed ? tinted(tint, 0.14) : 'transparent',
                opacity: disabled ? 0.35 : 1,
              })}
            >
              {key === 'delete' ? (
                <Delete size={22} color={vault.mute} strokeWidth={1.7} />
              ) : (
                <Text className="font-sora-medium text-[26px]" style={{ color: vault.ink }}>
                  {key}
                </Text>
              )}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}
