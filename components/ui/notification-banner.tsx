import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors as dsColors, elevation, layout } from '@/constants/design-tokens';
import { CATEGORY_META } from '@/features/notifications/types/notification.types';
import { useInAppNotificationStore } from '@/features/notifications/store/in-app-notification-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { alpha } from '@/lib/color';

/**
 * The in-app face of a notification that arrives while the app is open.
 *
 * Previously the OS banner simply dropped over whatever the user was doing —
 * covering the app's own content to announce something the app already knew.
 * `configureNotificationHandler` now suppresses that banner in the foreground
 * and this takes its place: same information, in the app's own language and
 * type, carrying the module's tint so a hydration nudge and a task due-time are
 * distinguishable at a glance, and tappable to go straight to the thing.
 *
 * Distinct from ToastHost on purpose. A toast is feedback for something *you*
 * just did and belongs near your thumb; a notification is something that
 * happened *to* you and belongs where the system would have put it — the top.
 */
export function NotificationBanner() {
  const current = useInAppNotificationStore((s) => s.current);
  const dismiss = useInAppNotificationStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const reducedMotion = useReducedMotion();
  const c = dsColors[scheme];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const id = current?.id;
  const title = current?.title;
  const body = current?.body;

  useEffect(() => {
    if (id === undefined) return;
    // Announced explicitly: a screen reader user gets nothing from a banner
    // that merely appears, and the OS banner that would have spoken for itself
    // is deliberately suppressed while the app is foregrounded.
    AccessibilityInfo.announceForAccessibility([title, body].filter(Boolean).join('. '));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(id), 5000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, title, body, dismiss]);

  if (!current) return null;

  const meta = CATEGORY_META[current.category];
  const Icon = meta.icon;
  const tint = meta.tint;

  return (
    <Animated.View
      pointerEvents="box-none"
      entering={reducedMotion ? undefined : FadeInUp.duration(240)}
      exiting={reducedMotion ? undefined : FadeOutUp.duration(180)}
      style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}
    >
      <Pressable
        onPress={() => {
          current.onPress?.();
          dismiss(current.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={[title, body].filter(Boolean).join('. ')}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 18,
            padding: 12,
            backgroundColor: c.raised,
            borderWidth: 1,
            borderColor: c.border,
            minHeight: layout.minTouchTarget,
          },
          elevation.e3,
        ]}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(tint, 0.14),
          }}
        >
          <Icon size={17} color={tint} />
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="font-sora-semibold text-sm text-foreground" numberOfLines={1}>
            {current.title}
          </Text>
          {current.body ? (
            <Text variant="caption" numberOfLines={2}>
              {current.body}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
