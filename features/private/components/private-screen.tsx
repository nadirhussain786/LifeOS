import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { Lamp, VaultStamp } from '@/features/private/components/well';
import { usePrivateStore } from '@/features/private/store/private-store';

/**
 * The shell every private module screen sits in.
 *
 * It exists mainly for the redirect: each screen must stop rendering the moment
 * the key disappears, or an auto-lock leaves decrypted content on screen for
 * whoever picks the phone up. Putting it in one shell means a new private
 * module cannot forget it, which is the kind of thing that gets forgotten
 * exactly once.
 *
 * ## Why the header is built rather than reused
 *
 * `ScreenHeader` is the app's, and it is the right component everywhere else —
 * which is precisely why it cannot be here. Its title, back chip and spacing
 * are the same on the budget screen, so a private module wearing it announced
 * that nothing about this place was different.
 *
 * This header is quieter: the module's name is the largest thing, the tint
 * lights the room from above rather than colouring the text, and a stamp above
 * the title states which module you are inside. All four modules share it, so
 * they read as four rooms in one building rather than four unrelated screens.
 */
type Props = {
  title: string;
  subtitle?: string;
  tint: string;
  /** Small uppercase word above the title — what this room is for. */
  stamp?: string;
  children: ReactNode;
  /** Rendered under the scroll area, over the ground (e.g. an add button). */
  footer?: ReactNode;
};

export function PrivateScreen({ title, subtitle, tint, stamp, children, footer }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vault = useVaultTheme();
  const key = usePrivateStore((s) => s.key);

  useEffect(() => {
    if (!key) router.replace('/private/unlock');
  }, [key, router]);

  if (!key) return null;

  return (
    <View style={{ flex: 1, backgroundColor: vault.void }}>
      {/* Each room is lit by its own module's colour. */}
      <Lamp tint={tint} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 14,
          paddingHorizontal: 20,
          paddingTop: insets.top + 10,
          paddingBottom: 14,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
            backgroundColor: pressed ? tinted(tint, 0.18) : vault.well,
            borderTopWidth: 1,
            borderTopColor: vault.wellEdge,
          })}
        >
          <ChevronLeft size={19} color={vault.mute} strokeWidth={2} />
        </Pressable>

        <View style={{ flex: 1, gap: 2 }}>
          {stamp ? <VaultStamp label={stamp} tint={tinted(tint, 0.9)} /> : null}
          <Text
            className="font-sora-extrabold text-[26px]"
            style={{ color: vault.ink, letterSpacing: -0.6 }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-xs" style={{ color: vault.faint, lineHeight: 17 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
          paddingTop: 4,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {footer ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 14 }}>{footer}</View>
      ) : null}
    </View>
  );
}

/**
 * A row of selectable chips — used for symptoms, triggers and tags, which are
 * the same interaction three times over.
 *
 * Unselected chips have no border here, only a recessed ground: on near-black a
 * ring of hairlines reads as a grid of empty boxes, and the eye has to work to
 * find the two that are on. Selection is carried by the tint filling the chip,
 * which is the one thing that reads instantly at a glance.
 */
export function ChipRow<T extends string>({
  options,
  selected,
  onToggle,
  tint,
  labelFor,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  tint: string;
  labelFor: (value: T) => string;
}) {
  const vault = useVaultTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <Pressable
            key={option}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            onPress={() => onToggle(option)}
            style={({ pressed }) => ({
              borderRadius: 999,
              paddingHorizontal: 15,
              minHeight: 38,
              justifyContent: 'center',
              backgroundColor: active
                ? tinted(tint, 0.22)
                : pressed
                  ? tinted(tint, 0.1)
                  : vault.well,
              borderTopWidth: 1,
              borderTopColor: active ? tinted(tint, 0.4) : vault.wellEdge,
            })}
          >
            <Text
              className="font-sora-medium text-sm"
              style={{ color: active ? tint : vault.mute }}
            >
              {labelFor(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
