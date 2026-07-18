import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors } from '@/constants/theme';

type Props = {
  /** 0–1. */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  duration?: number;
};

/** Thin animated track fill — the horizontal counterpart to ProgressRing.
 * The fill width springs to the new value whenever `progress` changes. */
export function ProgressBar({ progress, color, trackColor, height = 8, duration = 600 }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, { duration });
  }, [clamped, duration, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      style={{ height, backgroundColor: trackColor ?? colors[scheme].muted, borderRadius: height / 2, overflow: 'hidden' }}
    >
      <Animated.View
        style={[fillStyle, { height, borderRadius: height / 2, backgroundColor: color ?? colors[scheme].accent }]}
      />
    </View>
  );
}
