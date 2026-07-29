import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { QueryError } from '@/components/ui/query-error';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { useAuthStore } from '@/features/auth/services/auth-store';
import { useGroups } from '@/features/split/hooks/use-split';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Split groups. Requires an account: the whole point is shared data, and there
 * is nobody to share with in guest mode.
 */
export default function SplitGroupsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const tint = moduleTint('budget', scheme);

  const { data: groups = [], isLoading, isError, refetch } = useGroups({ enabled: !!session });

  if (!session) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title={t('split.title')} eyebrow={t('split.eyebrow')} tint={tint} />
        <EmptyState
          icon={Users}
          title={t('split.signInTitle')}
          description={t('split.signInBody')}
          tint={tint}
          actionLabel={t('sync.signInCreate')}
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={t('split.title')} eyebrow={t('split.eyebrow')} tint={tint} />

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : isLoading ? (
        <View className="gap-3 px-5 pt-2">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </View>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('split.emptyTitle')}
          description={t('split.emptyBody')}
          tint={tint}
          actionLabel={t('split.newGroup')}
          onAction={() => router.push('/split/new')}
        />
      ) : (
        <ScrollView
          contentContainerClassName="gap-2.5 px-5 pb-28 pt-1"
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => router.push(`/split/${group.id}`)}
              accessibilityRole="button"
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${tint}1f` }}
              >
                <Users size={19} color={tint} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-sora-semibold text-foreground" numberOfLines={1}>
                  {group.name}
                </Text>
                <Text variant="caption">{t(`split.kind.${group.kind}`)}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Fab onPress={() => router.push('/split/new')} accessibilityLabel={t('split.newGroup')} />
    </View>
  );
}
