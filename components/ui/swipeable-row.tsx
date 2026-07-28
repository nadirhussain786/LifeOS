import { type ReactNode } from 'react';
import { I18nManager, Platform, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const ACTIONS_WIDTH = 144;

/**
 * How far the card travels when open. The actions sit on the row's trailing
 * edge, so the card slides away from it: left (negative) in LTR, right
 * (positive) in RTL. Read once at module scope — a direction change restarts
 * the app, so this can't go stale mid-session.
 */
const OPEN_OFFSET = I18nManager.isRTL ? ACTIONS_WIDTH : -ACTIONS_WIDTH;

type Props = {
  children: ReactNode;
  actions: ReactNode;
  /** Exposes the swipe-only actions (archive/delete) to screen readers, which
   * can't perform a swipe. Consumers pass the same actions they render. */
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (name: string) => void;
};

/**
 * Swipe-to-reveal row, e.g. Mail.app archive/delete actions — rendered as a
 * floating rounded card rather than an edge-to-edge table row. The swipe runs
 * toward the leading edge, so left in LTR and right in RTL. The shadow lives
 * on a non-clipping outer View since `overflow: hidden` (needed to clip the
 * sliding content to the rounded corners) also clips shadows.
 */
export function SwipeableRow({
  children,
  actions,
  accessibilityActions,
  onAccessibilityAction,
}: Props) {
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
      // Clamp between closed (0) and fully open, whichever side that is.
      const next = startX.value + event.translationX;
      translateX.value =
        OPEN_OFFSET < 0
          ? Math.max(OPEN_OFFSET, Math.min(0, next))
          : Math.min(OPEN_OFFSET, Math.max(0, next));
    })
    .onEnd(() => {
      const shouldOpen = Math.abs(translateX.value) > ACTIONS_WIDTH / 2;
      translateX.value = withTiming(shouldOpen ? OPEN_OFFSET : 0, { duration: 200 });
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    backgroundColor: colors[scheme].card,
    borderColor: colors[scheme].border,
  }));

  return (
    <Animated.View style={styles.shadowWrap}>
      <Animated.View onTouchStart={close} style={styles.container}>
        <Animated.View style={styles.actions}>{actions}</Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.content, rowStyle]}
            accessibilityActions={accessibilityActions}
            onAccessibilityAction={
              onAccessibilityAction
                ? (e) => onAccessibilityAction(e.nativeEvent.actionName)
                : undefined
            }
          >
            {children}
          </Animated.View>
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Logical inset so the panel follows the trailing edge — right in LTR,
    // left in RTL — instead of being pinned to a physical side.
    insetInlineEnd: 0,
    width: ACTIONS_WIDTH,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
  },
});
