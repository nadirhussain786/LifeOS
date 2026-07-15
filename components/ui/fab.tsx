import { Plus } from 'lucide-react-native';
import { Pressable, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors[scheme].accent,
          shadowColor: colors[scheme].accent,
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
      ]}
    >
      <Plus color={colors[scheme].accentForeground} size={26} />
    </AnimatedPressable>
  );
}
