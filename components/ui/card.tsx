import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-lg border border-border bg-card p-4', className)}
      {...props}
    />
  );
}
