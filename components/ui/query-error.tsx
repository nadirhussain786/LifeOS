import { TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Shared error state for data screens. Without this, a failed query falls
 * through to the screen's empty state ("No transactions yet"), indistinguishable
 * from genuinely-empty — so users can't tell a load failure from no data, and
 * there's no way to retry.
 */
export function QueryError({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">
      <View
        className="h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: theme.muted }}
      >
        <TriangleAlert size={24} color={theme.mutedForeground} />
      </View>
      <Text className="font-sora-semibold text-foreground">{t('common.couldntLoad')}</Text>
      <Text variant="muted" className="text-center">
        {message ?? t('common.loadFailedBody')}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="mt-1 rounded-full border border-border bg-card px-5 py-2.5"
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text className="font-sora-medium text-foreground">{t('common.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}
