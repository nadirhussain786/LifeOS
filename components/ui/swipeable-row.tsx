import { type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const ACTIONS_WIDTH = 144;

type Props = {
  children: ReactNode;
  actions: ReactNode;
};

/** Swipe-left-to-reveal row, e.g. Mail.app archive/delete actions. */
export function SwipeableRow({ children, actions }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const close = () => {
    translateX.value = withTiming(0, { duration: 200 });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const next = startX.value + event.translationX;
      translateX.value = Math.max(-ACTIONS_WIDTH, Math.min(0, next));
    })
    .onEnd(() => {
      const shouldOpen = translateX.value < -ACTIONS_WIDTH / 2;
      translateX.value = withTiming(shouldOpen ? -ACTIONS_WIDTH : 0, { duration: 200 });
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: colors[scheme].background,
  }));

  return (
    <Animated.View onTouchStart={close} style={styles.container}>
      <Animated.View style={[styles.actions, { width: ACTIONS_WIDTH }]}>{actions}</Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actions: {
    ...StyleSheet.absoluteFillObject,
    left: undefined,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
});
