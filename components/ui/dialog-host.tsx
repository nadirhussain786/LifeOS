import * as Haptics from 'expo-haptics';
import { TriangleAlert } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors as dsColors, elevation, layout } from '@/constants/design-tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useDialogStore } from '@/lib/dialog-store';

/**
 * Renders whatever is in the dialog store — see lib/dialog-store.ts for why
 * this exists rather than `Alert.alert`.
 *
 * Uses RN's `Modal` rather than an absolutely-positioned overlay, for one
 * reason that is hard to add back later: it puts the content in its own window,
 * so Android's hardware back button and the accessibility focus trap both work
 * without any of it being reimplemented. A confirmation you cannot dismiss with
 * back is a confirmation people force-quit the app to escape.
 */
export function DialogHost() {
  const pending = useDialogStore((s) => s.pending);
  const settle = useDialogStore((s) => s.settle);
  const scheme = useColorScheme() ?? 'light';
  const c = dsColors[scheme];
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const visible = pending !== null;
  const destructive = pending?.kind === 'confirm' && pending.request.destructive;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      // Back button and the iOS swipe both mean "no", which is the safe answer
      // for every question this component asks.
      onRequestClose={() => settle(pending?.kind === 'confirm' ? false : null)}
    >
      {pending ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(140)}
          exiting={reducedMotion ? undefined : FadeOut.duration(120)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          {/* Tapping the scrim cancels. Sized to fill so the tap target is the
              whole background rather than a strip. */}
          <Pressable
            style={{ flex: 1, justifyContent: 'flex-end' }}
            // A one-button notice has no cancel label; dismissing it is still
            // the same gesture, so it is announced by what it does close.
            accessibilityLabel={pending.request.cancelLabel ?? pending.request.title}
            accessibilityRole="button"
            onPress={() => settle(pending.kind === 'confirm' ? false : null)}
          >
            {/* Stops a tap on the card itself reaching the scrim behind it. */}
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 12 }}
            >
              <Animated.View
                entering={reducedMotion ? undefined : FadeInDown.duration(200)}
                style={[
                  {
                    borderRadius: 26,
                    backgroundColor: c.raised,
                    borderWidth: 1,
                    borderColor: c.border,
                    padding: 20,
                    gap: 14,
                  },
                  elevation.e3,
                ]}
              >
                <View style={{ gap: 8 }}>
                  {destructive ? (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${c.error}1f`,
                      }}
                    >
                      <TriangleAlert size={20} color={c.error} strokeWidth={2.2} />
                    </View>
                  ) : null}

                  <Text variant="subheading">{pending.request.title}</Text>
                  {pending.request.message ? (
                    <Text variant="caption">{pending.request.message}</Text>
                  ) : null}
                </View>

                {pending.kind === 'choose' ? (
                  <View style={{ gap: 8 }}>
                    {pending.request.actions.map((action) => (
                      <Pressable
                        key={action.id}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          settle(action.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={action.label}
                        style={{
                          minHeight: layout.minTouchTarget,
                          justifyContent: 'center',
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: c.border,
                          paddingHorizontal: 16,
                        }}
                      >
                        <Text
                          className="font-sora-medium"
                          style={{ color: action.destructive ? c.error : c.foreground }}
                        >
                          {action.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {/* Cancel first in the reading order, so the destructive button
                    is never the one under a thumb travelling to dismiss. It is
                    absent for a one-button notice (see `notify`), where there
                    is nothing to decline. */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {pending.request.cancelLabel ? (
                    <View style={{ flex: 1 }}>
                      <Button
                        label={pending.request.cancelLabel}
                        variant="secondary"
                        onPress={() => settle(pending.kind === 'confirm' ? false : null)}
                      />
                    </View>
                  ) : null}
                  {pending.kind === 'confirm' ? (
                    <View style={{ flex: 1 }}>
                      <Button
                        label={pending.request.confirmLabel}
                        variant={destructive ? 'destructive' : 'primary'}
                        onPress={() => {
                          void Haptics.impactAsync(
                            destructive
                              ? Haptics.ImpactFeedbackStyle.Medium
                              : Haptics.ImpactFeedbackStyle.Light,
                          );
                          settle(true);
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            </Pressable>
          </Pressable>
        </Animated.View>
      ) : null}
    </Modal>
  );
}
