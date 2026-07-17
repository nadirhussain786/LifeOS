import { cva, type VariantProps } from 'class-variance-authority';
import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/lib/utils';

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      default: 'text-base',
      heading: 'text-2xl font-sora-extrabold tracking-tight',
      subheading: 'text-lg font-sora-semibold',
      muted: 'text-sm text-muted-foreground',
      caption: 'text-xs text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type Props = TextProps & VariantProps<typeof textVariants> & { className?: string };

export function Text({ className, variant, ...props }: Props) {
  return <RNText className={cn(textVariants({ variant }), className)} {...props} />;
}
