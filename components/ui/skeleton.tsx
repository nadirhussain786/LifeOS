import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: ViewProps & { className?: string }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style}>
      <View className={cn('rounded-md bg-muted', className)} {...props} />
    </Animated.View>
  );
}
