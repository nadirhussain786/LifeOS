import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the OS is asking for reduced motion ("Reduce Motion" on iOS, "Remove
 * animations" on Android).
 *
 * constants/design-tokens.ts has always said that celebratory motion must be
 * gated behind this; nothing was reading it, so the confetti burst, the
 * FadeInDown card entrances and the empty-state pop played at full strength for
 * people whose devices had explicitly asked them not to. For a vestibular
 * disorder that setting is not a preference, it is the difference between using
 * the app and feeling ill.
 *
 * Read once at mount and then kept current via the change subscription, because
 * the setting can be toggled from Control Centre without the app restarting.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) =>
      setReduced(value),
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/**
 * Reanimated layout animations are chosen at render time, so the usual pattern
 * is `entering={motionSafe(reduced, FadeInDown.duration(320))}` — the animation
 * when motion is welcome, `undefined` (an instant cut) when it is not.
 */
export function motionSafe<T>(reduced: boolean, animation: T): T | undefined {
  return reduced ? undefined : animation;
}
