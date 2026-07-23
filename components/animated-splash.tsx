import { Leaf } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Per-theme brand grounds — these match the native splash backgroundColor
// (app.json expo-splash-screen light/dark), so the hand-off from the OS splash
// to this animated one is seamless in both light and dark.
const THEME = {
  light: { bg: '#f8fbf9', mark: '#188b61', leaf: '#ffffff', word: '#161c19' },
  dark: { bg: '#0e1210', mark: '#47d19f', leaf: '#0f241c', word: '#eef3f0' },
} as const;

/**
 * A short, calm branded splash that plays once on cold start after the native
 * splash hides: the emerald mark springs in, the wordmark rises beneath it,
 * then the whole layer fades away to reveal the app. Purpose before decoration
 * — one gentle moment, ~1.3s total, then gone.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = THEME[scheme];

  const container = useSharedValue(1);
  const markScale = useSharedValue(0.82);
  const markOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordShift = useSharedValue(10);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 320 });
    markScale.value = withSpring(1, { damping: 12, stiffness: 160 });
    wordOpacity.value = withDelay(220, withTiming(1, { duration: 320 }));
    wordShift.value = withDelay(220, withSpring(0, { damping: 14, stiffness: 180 }));
    // Hold, then fade the whole layer out and notify the parent to unmount it.
    container.value = withDelay(
      980,
      withTiming(0, { duration: 360, easing: Easing.bezier(0.3, 0, 1, 1) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [container, markOpacity, markScale, onFinish, wordOpacity, wordShift]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value, transform: [{ scale: markScale.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: wordOpacity.value, transform: [{ translateY: wordShift.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, styles.fill, { backgroundColor: c.bg }, containerStyle]}
    >
      <Animated.View style={markStyle}>
        <View style={[styles.mark, { backgroundColor: c.mark, shadowColor: c.mark }]}>
          <Leaf size={40} color={c.leaf} strokeWidth={2} />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.word, { color: c.word }, wordStyle]}>LifeOS</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  mark: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  word: {
    marginTop: 22,
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 28,
    letterSpacing: -0.8,
  },
});
