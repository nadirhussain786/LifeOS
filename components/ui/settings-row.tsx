import { type LucideIcon, ChevronRight } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

type Props = {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  value?: string;
  destructive?: boolean;
  isFirst?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Set false to suppress the default chevron on a tappable row that performs
   * an inline action (export, delete) rather than navigating somewhere. */
  chevron?: boolean;
  /** Custom trailing element (e.g. a Switch) instead of the default chevron/value. */
  right?: ReactNode;
};

/** One tappable row within a settings card — icon, label + optional subtitle,
 * and a trailing chevron/value/custom control. Shared by every section of
 * the Settings screen. */
export function SettingsRow({ icon: Icon, label, subtitle, value, destructive, isFirst, disabled, onPress, chevron = true, right }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = destructive ? colors[scheme].destructive : colors[scheme].foreground;

  const content = (
    <View
      className={isFirst ? 'flex-row items-center gap-3 py-3.5' : 'flex-row items-center gap-3 border-t border-border py-3.5'}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Icon size={17} color={tint} />
      <View className="flex-1 gap-0.5">
        <Text className="font-sora-medium" style={{ color: tint }}>
          {label}
        </Text>
        {subtitle && <Text variant="caption">{subtitle}</Text>}
      </View>
      {right ?? (value ? (
        <Text variant="muted">{value}</Text>
      ) : onPress && chevron ? (
        <ChevronRight size={17} color={colors[scheme].mutedForeground} />
      ) : null)}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {content}
    </Pressable>
  );
}
