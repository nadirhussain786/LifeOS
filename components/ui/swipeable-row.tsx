import { type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const ACTIONS_WIDTH = 144;

type Props = {
  children: ReactNode;
  actions: ReactNode;
};

/**
 * Swipe-left-to-reveal row, e.g. Mail.app archive/delete actions — rendered
 * as a floating rounded card rather than an edge-to-edge table row. The
 * shadow lives on a non-clipping outer View since `overflow: hidden` (needed
 * to clip the sliding content to the rounded corners) also clips shadows.
 */
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
    backgroundColor: colors[scheme].card,
    borderColor: colors[scheme].border,
  }));

  return (
    <Animated.View style={styles.shadowWrap}>
      <Animated.View onTouchStart={close} style={styles.container}>
        <Animated.View style={[styles.actions, { width: ACTIONS_WIDTH }]}>{actions}</Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.content, rowStyle]}>{children}</Animated.View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    // Android's `elevation` draws a much harsher, more opaque shadow than
    // iOS's shadow* properties — with cards this close together it reads as
    // a solid gray band under every row rather than a subtle lift. Card
    // definition on Android comes from the border + card/background
    // contrast alone instead.
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 0 },
    }),
  },
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
  },
  content: {
    borderWidth: 1,
    borderRadius: 18,
  },
  actions: {
    ...StyleSheet.absoluteFillObject,
    left: undefined,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
  },
});
