import { useEffect, useId, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors } from '@/constants/theme';
import { tintGradient } from '@/lib/color';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** 0–1. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Content centered inside the ring (a number, label, icon…). */
  children?: ReactNode;
  /** Milliseconds for the sweep animation when progress changes. */
  duration?: number;
  /** Paint the arc with a gradient derived from `color` (premium look). */
  gradient?: boolean;
};

/**
 * Animated circular progress ring built on react-native-svg + Reanimated.
 * The arc sweeps from 12 o'clock and animates whenever `progress` changes.
 * With `gradient`, the stroke is painted with a two-stop gradient derived from
 * `color` — the signature "glowing ring" of the premium design language.
 */
export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 12,
  color,
  trackColor,
  children,
  duration = 700,
  gradient,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  // useId() emits colons (":r0:") which are invalid inside an SVG url(#id)
  // reference and break the gradient on Android's native SVG — strip them.
  const gradientId = `ring${useId().replace(/:/g, '')}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(clamped, { duration });
  }, [animated, clamped, duration]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  const arcColor = color ?? colors[scheme].accent;
  const track = trackColor ?? colors[scheme].muted;
  const [gradStart, gradEnd] = tintGradient(arcColor);
  const stroke = gradient ? `url(#${gradientId})` : arcColor;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {gradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradStart} />
              <Stop offset="100%" stopColor={gradEnd} />
            </LinearGradient>
          </Defs>
        )}
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
