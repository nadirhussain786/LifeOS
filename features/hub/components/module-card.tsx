import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import type { HubModule } from '@/features/hub/config/modules';
import { alpha, glowShadow, tintGradientTriple } from '@/lib/color';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  module: HubModule;
  onPress: (module: HubModule) => void;
};

/**
 * One tile in the Hub grid. Ready modules render as a saturated gradient tile
 * (its signature tint) with a frosted icon chip, soft glow and depth orbs —
 * the "app drawer of colorful apps" launcher feel. "Soon" modules stay as a
 * muted outlined card so the live modules pop and the grid reads as a roadmap.
 */
export function ModuleCard({ module, onPress }: Props) {
  const { icon: Icon, title, subtitle, tint, status } = module;
  const isReady = status === 'ready';
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (!isReady) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(module);
  };

  if (!isReady) {
    return (
      <View className="flex-1 gap-3 rounded-3xl border border-border bg-card p-4" style={{ opacity: 0.6, minHeight: 130 }}>
        <View className="flex-row items-start justify-between">
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: alpha(tint, 0.14) }}>
            <Icon color={tint} size={22} strokeWidth={2} />
          </View>
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text className="text-[10px] font-sora-semibold uppercase tracking-wide text-muted-foreground">Soon</Text>
          </View>
        </View>
        <View className="mt-auto gap-0.5">
          <Text className="font-sora-bold text-base text-foreground">{title}</Text>
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }

  const [c1, c2, c3] = tintGradientTriple(tint);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => (scale.value = withTiming(0.96, { duration: 90 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 90 }))}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={`Open ${title}`}
      style={[animatedStyle, { flex: 1, borderRadius: 24, minHeight: 130 }, glowShadow(tint, 0.28)]}
    >
      <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}>
        <LinearGradient colors={[c1, c2, c3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 16 }}>
          <View pointerEvents="none" style={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: alpha('#ffffff', 0.13) }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: -34, left: -14, width: 90, height: 90, borderRadius: 45, backgroundColor: alpha('#ffffff', 0.08) }} />

          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: alpha('#ffffff', 0.22) }}>
            <Icon color="#ffffff" size={22} strokeWidth={2.2} />
          </View>
          <View className="mt-auto gap-0.5">
            <Text className="font-sora-bold text-base" style={{ color: '#ffffff' }}>
              {title}
            </Text>
            <Text numberOfLines={1} style={{ color: alpha('#ffffff', 0.85), fontSize: 12 }}>
              {subtitle}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
}
