import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva('flex-row items-center justify-center rounded-md active:opacity-90', {
  variants: {
    variant: {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      ghost: 'bg-transparent',
      destructive: 'bg-destructive',
    },
    size: {
      sm: 'h-9 px-3',
      md: 'h-11 px-4',
      lg: 'h-12 px-6',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const textVariants = cva('font-medium', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      destructive: 'text-destructive-foreground',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type Props = PressableProps &
  VariantProps<typeof buttonVariants> & {
    label: string;
    className?: string;
  };

// The scale animation lives on a wrapping Animated.View rather than the
// Pressable itself: Animated.createAnimatedComponent(Pressable) creates a
// component NativeWind hasn't registered className/style interop for, so a
// className passed directly to it is silently dropped (renders unstyled).
export function Button({ label, variant, size, className, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className={cn(buttonVariants({ variant, size }), className)}
        onPressIn={(e) => {
          scale.value = withTiming(0.97, { duration: 100 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, { duration: 100 });
          onPressOut?.(e);
        }}
        {...props}
      >
        <Text className={textVariants({ variant, size })}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
