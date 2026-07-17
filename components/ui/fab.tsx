import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Same gradient as the accent Button — the FAB and primary CTAs should read
// as the same signature brand surface wherever they appear.
const ACCENT_GRADIENT = ['#22c58e', '#0b6b4f'] as const;

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function Fab({ onPress, accessibilityLabel = 'Quick actions' }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.92, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 100 });
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[
        animatedStyle,
        {
          position: 'absolute',
          right: 20,
          bottom: insets.bottom + 20,
          height: 56,
          width: 56,
          borderRadius: 28,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors[scheme].accent,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 5,
        },
      ]}
    >
      <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <Plus color={colors[scheme].accentForeground} size={26} />
    </AnimatedPressable>
  );
}
