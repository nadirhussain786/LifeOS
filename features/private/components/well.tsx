import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';

/**
 * The vault's container, in place of the app's card.
 *
 * The app's card is `rounded-2xl border border-border bg-card` — a lighter
 * surface with a border, lifted off the background. It appears 138 times, and
 * repeating it in here is most of why the private space felt like the rest of
 * the app wearing a different colour.
 *
 * A well inverts every one of those decisions. It is *darker* than the ground
 * it sits on, has no border, and is lit by a single hairline along its top edge
 * — the way a recess catches light from above. The content reads as set into
 * the surface rather than placed on it.
 *
 * That is not decoration. The app displays your data; the vault holds it, and
 * the shape should say which of those is happening before anything is read.
 */

export function Well({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const vault = useVaultTheme();

  const surface: ViewStyle = {
    backgroundColor: vault.well,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // The lit lip. A full border would read as a card again; only the top edge
    // catches light, which is what makes the shape read as a recess.
    borderTopWidth: 1,
    borderTopColor: vault.wellEdge,
    ...style,
  };

  if (!onPress) return <View style={surface}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [surface, pressed && { opacity: 0.7 }]}
    >
      {children}
    </Pressable>
  );
}

/**
 * A module's row on the private index: glyph plate, name, one line of state.
 *
 * `meta` is deliberately not a count of anything sensitive. "Day 14" and "18
 * items" describe the shape of what is inside, never the content — the same
 * line this screen could show to somebody reading over a shoulder.
 */
export function ModuleWell({
  icon: Icon,
  tint,
  name,
  meta,
  onPress,
}: {
  icon: LucideIcon;
  tint: string;
  name: string;
  meta?: string;
  onPress: () => void;
}) {
  const vault = useVaultTheme();

  return (
    <Well onPress={onPress} accessibilityLabel={name}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tinted(tint, 0.16),
          }}
        >
          <Icon size={19} color={tint} strokeWidth={1.9} />
        </View>

        <View style={{ flex: 1, gap: 1 }}>
          <Text className="font-sora-semibold text-base" style={{ color: vault.ink }}>
            {name}
          </Text>
          {meta ? (
            <Text className="text-xs" style={{ color: vault.faint }}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>
    </Well>
  );
}

/**
 * The overhead light.
 *
 * One soft pool of the module's tint bleeding down from the top of the screen,
 * and it is the only source of colour on the ground. The app lights every
 * surface evenly; a strongroom has a lamp.
 *
 * Rendered as stacked translucent bands rather than a gradient dependency: on
 * near-black the banding is invisible, and it keeps the private space free of
 * another native module to configure.
 */
export function Lamp({ tint, height = 190 }: { tint: string; height?: number }) {
  const bands = 7;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
      // Decorative: a screen reader announcing "lamp" would be noise.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: bands }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            // Quadratic falloff, so the light fades the way light does rather
            // than stepping evenly to nothing.
            backgroundColor: tinted(tint, 0.05 * Math.pow(1 - i / bands, 2)),
          }}
        />
      ))}
    </View>
  );
}

/**
 * A small uppercase status word — "SEALED", "UNLOCKED".
 *
 * The one place the space states its own condition. Kept quiet: a padlock icon
 * would be decoration, whereas the word is a claim the app can actually back
 * up.
 */
export function VaultStamp({ label, tint }: { label: string; tint?: string }) {
  const vault = useVaultTheme();

  return (
    <Text
      className="font-sora-semibold text-[10px]"
      style={{ color: tint ?? vault.faint, letterSpacing: 1.6 }}
    >
      {label.toUpperCase()}
    </Text>
  );
}

/**
 * The numbers a module leads with — day of cycle, days clean, items held.
 *
 * Set on the ground rather than in wells. Three bordered cards in a row is the
 * app's stat pattern and it fragments the screen into boxes; here the figures
 * are simply large, and the hairline between them is the only division. The
 * value carries the module's tint because on this ground colour reads as
 * emphasis far more cheaply than weight does.
 */
export function StatStrip({
  items,
  tint,
}: {
  items: { label: string; value: string }[];
  tint: string;
}) {
  const vault = useVaultTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
      {items.map((item, index) => (
        <View key={item.label} style={{ flexDirection: 'row', flex: 1 }}>
          {index > 0 ? (
            <View style={{ width: 1, backgroundColor: vault.line, marginVertical: 4 }} />
          ) : null}
          <View style={{ flex: 1, gap: 3, paddingHorizontal: index === 0 ? 0 : 14 }}>
            <Text
              className="font-sora-bold text-[27px]"
              style={{ color: tint, letterSpacing: -0.8 }}
              // Figures line up across the strip even as values change width.
              maxFontSizeMultiplier={1.2}
            >
              {item.value}
            </Text>
            <Text className="text-[11px]" style={{ color: vault.faint, lineHeight: 15 }}>
              {item.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * The vault's text field.
 *
 * A well with a caret in it. The app's inputs are bordered boxes on a light
 * ground; a bordered box on near-black reads as an empty frame, so the field is
 * recessed instead and the text itself is the only bright thing.
 */
export function VaultField({
  tint,
  containerStyle,
  ...props
}: TextInputProps & { tint: string; containerStyle?: ViewStyle }) {
  const vault = useVaultTheme();

  return (
    <View
      style={{
        backgroundColor: vault.well,
        borderRadius: 16,
        borderTopWidth: 1,
        borderTopColor: vault.wellEdge,
        paddingHorizontal: 16,
        paddingVertical: 12,
        ...containerStyle,
      }}
    >
      <TextInput
        placeholderTextColor={vault.faint}
        selectionColor={tint}
        style={{
          color: vault.ink,
          fontFamily: 'Sora_400Regular',
          fontSize: 15,
          minHeight: 22,
          padding: 0,
          textAlignVertical: 'top',
        }}
        {...props}
      />
    </View>
  );
}

/**
 * The vault's primary action.
 *
 * Filled with the module's tint at low opacity rather than solid: a saturated
 * button on near-black is the brightest object on screen, which puts the
 * emphasis on the control instead of on what the person came here to read. The
 * label carries the full-strength tint, so it still reads as the thing to press.
 */
export function VaultButton({
  label,
  onPress,
  tint,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tint: string;
  disabled?: boolean;
}) {
  const vault = useVaultTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tinted(tint, pressed ? 0.32 : 0.2),
        borderTopWidth: 1,
        borderTopColor: tinted(tint, 0.35),
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Text
        className="font-sora-semibold text-[15px]"
        style={{ color: disabled ? vault.mute : tint }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Section label inside a module — quieter than a heading, louder than body. */
export function VaultLabel({ children }: { children: string }) {
  const vault = useVaultTheme();
  return (
    <Text
      className="font-sora-semibold text-[11px]"
      style={{ color: vault.faint, letterSpacing: 1.2 }}
    >
      {children.toUpperCase()}
    </Text>
  );
}
