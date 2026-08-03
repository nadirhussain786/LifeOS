import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Search } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ModuleCard } from '@/features/hub/components/module-card';
import { HUB_SECTIONS, type HubModule } from '@/features/hub/config/modules';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Splits a section's modules into rows of two so the grid stays aligned even
 * when a section holds an odd count (the gap is filled with an invisible
 * spacer rather than letting a lone card stretch full-width). */
function toRows(modules: HubModule[]): (HubModule | null)[][] {
  const rows: (HubModule | null)[][] = [];
  for (let i = 0; i < modules.length; i += 2) {
    const row: (HubModule | null)[] = [modules[i]];
    row.push(modules[i + 1] ?? null);
    rows.push(row);
  }
  return rows;
}

export default function HubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const scheme = useColorScheme() ?? 'light';

  const sections = useMemo(
    () => HUB_SECTIONS.map((section) => ({ ...section, rows: toRows(section.modules) })),
    [],
  );

  const readyCount = useMemo(
    () =>
      HUB_SECTIONS.reduce(
        (sum, s) => sum + s.modules.filter((m) => m.status === 'ready').length,
        0,
      ),
    [],
  );

  const handleOpen = (module: HubModule) => router.push(module.getRoute() as never);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
        contentContainerClassName="gap-6 px-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text variant="heading">{t('hub.title')}</Text>
            <Text variant="muted">{t('hub.modulesReady', { count: readyCount })}</Text>
          </View>
          {/* The screen listing every module is exactly where "I know I wrote
              it down somewhere" happens. */}
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel={t('search.title')}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Search size={20} color={colors[scheme].foreground} />
          </Pressable>
        </View>

        {sections.map((section, sectionIndex) => (
          <View key={section.id} className="gap-3">
            <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
              {t(section.labelKey)}
            </Text>
            <View className="gap-3">
              {section.rows.map((row, rowIndex) => (
                <Animated.View
                  key={rowIndex}
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.delay(80 * sectionIndex + 40 * rowIndex).duration(320)
                  }
                  className="flex-row gap-3"
                >
                  {row.map((module, cellIndex) =>
                    module ? (
                      <ModuleCard key={module.id} module={module} onPress={handleOpen} />
                    ) : (
                      <View key={`spacer-${cellIndex}`} className="flex-1" />
                    ),
                  )}
                </Animated.View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
