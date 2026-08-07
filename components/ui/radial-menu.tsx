import * as Haptics from 'expo-haptics';
import { type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { accentGradient, elevation, motion, opacity } from '@/constants/design-tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

export type RadialAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  actions: RadialAction[];
  /** Distance from the anchor to each action's centre. */
  radius?: number;
  /** Where the arc sweeps from and to, in degrees. 180 = due left, 270 = up. */
  startAngle?: number;
  endAngle?: number;
};

const ITEM = 52;

/**
 * A quarter-arc of actions that fans out from a fixed anchor.
 *
 * The FAB is kept as the thing you can see — an app whose only way to create
 * something is an undiscoverable long-press is a worse app, whatever it looks
 * like. Tapping still opens the full sheet. Long-pressing fans the same
 * actions out under the thumb, which is the faster path once you know it is
 * there, and reaching them costs one gesture instead of tap-wait-read-tap.
 *
 * The arc sweeps up and to the left because the FAB sits at the trailing
 * bottom corner, so that is the only quadrant with room, and it is where a
 * right thumb already is. `insetInlineEnd` on the FAB means it flips in RTL;
 * the arc is positioned relative to the same anchor and flips with it.
 */
export function RadialMenu({
  open,
  onClose,
  actions,
  radius = 108,
  startAngle = 182,
  endAngle = 268,
}: Props) {
  const { c } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = open ? 1 : 0;
      return;
    }
    progress.value = open
      ? withSpring(1, motion.spring.gentle)
      : withTiming(0, { duration: motion.duration.fast });
  }, [open, progress, reducedMotion]);

  const scrim = useAnimatedStyle(() => ({
    opacity: progress.value * opacity.scrim,
  }));

  if (!open && progress.value === 0) return null;

  const step = actions.length > 1 ? (endAngle - startAngle) / (actions.length - 1) : 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      {/* Tapping anywhere dismisses. A radial menu with no way out except the
          exact button you opened it with is a trap on a phone. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button">
        <Animated.View style={[StyleSheet.absoluteFill, scrim, { backgroundColor: '#000' }]} />
      </Pressable>

      {actions.map((action, index) => (
        <RadialItem
          key={action.key}
          action={action}
          angle={startAngle + step * index}
          radius={radius}

          progress={progress}

          surface={c.card}
          border={c.border}
          onClose={onClose}
        />
      ))}
    </View>
  );
}

function RadialItem({
  action,
  angle,
  radius,

  progress,

  surface,
  border,
  onClose,
}: {
  action: RadialAction;
  angle: number;
  radius: number;

  progress: SharedValue<number>;

  surface: string;
  border: string;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const radians = (angle * Math.PI) / 180;
  // Anchor matches the FAB: 20 from the trailing edge and the bottom inset,
  // 56 across, so its centre is 48 in from each.
  const dx = Math.cos(radians) * radius;
  const dy = Math.sin(radians) * radius;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [{ translateX: dx * p }, { translateY: dy * p }, { scale: 0.6 + 0.4 * p }],
    };
  });

  const [start] = accentGradient;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          insetInlineEnd: 48 - ITEM / 2,
          bottom: 48 - ITEM / 2,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
          action.onPress();
        }}
        style={[
          {
            height: ITEM,
            width: ITEM,
            borderRadius: ITEM / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
          },
          elevation.e3,
        ]}
      >
        <action.icon size={22} color={start} strokeWidth={2.2} />
      </Pressable>
      {/* Labelled, because an unlabelled ring of icons is a memory test. */}
      <View
        style={{
          marginTop: 6,
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 2,
          backgroundColor: surface,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <Text variant="caption" numberOfLines={1} style={{ color: c.foreground, fontSize: 10.5 }}>
          {action.label}
        </Text>
      </View>
    </Animated.View>
  );
}
