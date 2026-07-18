import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const CONFETTI_COLORS = ['#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899'];
const PIECE_COUNT = 28;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** One confetti piece. Deterministic per-index trajectory (no Math.random in
 * render) so re-renders never reshuffle a piece mid-flight — variety comes
 * from the index. `play` is a monotonically increasing token; each new value
 * restarts the fall. */
function ConfettiPiece({ index, play }: { index: number; play: number }) {
  const progress = useSharedValue(0);

  const startX = (SCREEN_WIDTH / PIECE_COUNT) * index + ((index % 3) - 1) * 12;
  const drift = ((index % 5) - 2) * 40;
  const size = 7 + (index % 4) * 2;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const delay = (index % 6) * 60;
  const spin = index % 2 === 0 ? 360 : -360;

  useEffect(() => {
    if (play === 0) return;
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }));
  }, [play, delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 1 - progress.value,
    transform: [
      { translateX: drift * progress.value },
      { translateY: SCREEN_HEIGHT * 0.75 * progress.value },
      { rotate: `${spin * progress.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.18,
          left: startX,
          width: size,
          height: size * 1.6,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

type Props = {
  visible: boolean;
  /** Fires ~1.6s after the burst starts so the parent can reset its trigger. */
  onDone?: () => void;
};

/**
 * Full-screen confetti burst. Flip `visible` to true to fire it; it plays once
 * per rising edge and calls onDone when the pieces have settled. Non-interactive
 * (pointerEvents none) so it never blocks the UI underneath.
 */
export function CelebrationOverlay({ visible, onDone }: Props) {
  const [play, setPlay] = useState(0);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPlay((count) => count + 1);
      const timer = setTimeout(() => onDone?.(), 1700);
      wasVisible.current = true;
      return () => clearTimeout(timer);
    }
    if (!visible) wasVisible.current = false;
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: PIECE_COUNT }).map((_, index) => (
        <ConfettiPiece key={index} index={index} play={play} />
      ))}
    </View>
  );
}
