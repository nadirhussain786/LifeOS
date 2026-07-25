import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FOCUS_AREAS, focusTint } from '@/features/profile/constants';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

/**
 * A personalized quick-access row built from the focus areas the user picked in
 * onboarding — a fast lane into exactly the modules they said they care about
 * (including ones with no dashboard widget, like Sleep, Goals or Budget). Sits
 * right under the momentum hero. Renders nothing if no focus areas were chosen,
 * so the dashboard stays clean for anyone who skipped that step.
 */
export function FocusShortcuts() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const focusAreas = useProfileStore((s) => s.focusAreas);

  if (focusAreas.length === 0) return null;

  // Preserve the canonical FOCUS_AREAS order rather than selection order.
  const chosen = FOCUS_AREAS.filter((area) => focusAreas.includes(area.id));

  return (
    <View className="gap-3">
      <Text variant="micro" className="px-1">
        Your focus
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2.5 px-1"
      >
        {chosen.map((area) => {
          const tint = focusTint(area.module, scheme);
          const Icon = area.icon;
          return (
            <Pressable
              key={area.id}
              onPress={() => router.push(area.route as never)}
              className="flex-row items-center gap-2.5 rounded-2xl border border-border bg-card py-2.5 pl-2.5 pr-4 shadow-e1"
            >
              <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: alpha(tint, 0.14) }}>
                <Icon size={17} color={tint} />
              </View>
              <Text className="font-sora-semibold">{area.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
