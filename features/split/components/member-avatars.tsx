import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors as dsColors } from '@/constants/design-tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Overlapping initial chips for a group's members.
 *
 * A group's identity is the people in it, and a row that said "4 people" made
 * every group look the same. Colour is derived from the name, so the same
 * person keeps the same chip everywhere without needing an avatar stored
 * anywhere — and the palette is the chart series, which is already tuned for
 * both themes and for being distinguishable side by side.
 */

const PALETTE = {
  light: ['#0d9488', '#3b82f6', '#8b5cf6', '#f97316', '#e11d48', '#0891b2'],
  dark: ['#2dd4bf', '#60a5fa', '#a78bfa', '#fb923c', '#fb7185', '#22d3ee'],
} as const;

/** Stable per-name colour: same string always lands on the same swatch. */
function colorFor(name: string, scheme: 'light' | 'dark'): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const row = PALETTE[scheme];
  return row[hash % row.length];
}

/** First letter of the name, or of the email's local part. */
function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
}

type Props = {
  names: string[];
  /** Total members, so an overflow chip can say how many are not shown. */
  total?: number;
  size?: number;
};

export function MemberAvatars({ names, total, size = 26 }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const shown = names.slice(0, 3);
  const overflow = Math.max(0, (total ?? names.length) - shown.length);
  if (shown.length === 0) return null;

  const chip = (
    key: string,
    label: string,
    background: string,
    foreground: string,
    index: number,
  ) => (
    <View
      key={key}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        borderWidth: 2,
        borderColor: dsColors[scheme].card,
        marginLeft: index === 0 ? 0 : -size * 0.3,
      }}
    >
      <Text
        className="font-sora-bold"
        style={{ fontSize: size * 0.42, color: foreground }}
        // These are decorative: the row already names the group and its size.
        maxFontSizeMultiplier={1}
      >
        {label}
      </Text>
    </View>
  );

  return (
    // One label for the cluster; three separate "T", "A", "+2" announcements
    // would be noise.
    <View
      className="flex-row items-center"
      accessible
      accessibilityRole="image"
      accessibilityLabel={names.join(', ')}
    >
      {shown.map((name, index) =>
        chip(`${name}-${index}`, initial(name), colorFor(name, scheme), '#ffffff', index),
      )}
      {overflow > 0
        ? chip(
            'overflow',
            `+${overflow}`,
            dsColors[scheme].surface,
            dsColors[scheme].mutedForeground,
            shown.length,
          )
        : null}
    </View>
  );
}
