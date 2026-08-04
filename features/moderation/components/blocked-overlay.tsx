import { format } from 'date-fns';
import { ShieldAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/features/auth/services/auth-store';
import { useAccountStanding } from '@/features/moderation/hooks/use-account-standing';
import { useColorScheme } from '@/hooks/use-color-scheme';

const APPEAL_EMAIL = 'nh262464@gmail.com';

/**
 * Shown when the account is blocked.
 *
 * Three deliberate choices. It states the reason, because a verdict somebody
 * cannot see is a support ticket answered by hand. It offers a way to appeal,
 * because automated decisions are wrong sometimes. And it offers sign-out
 * rather than trapping the person — signing out drops to guest mode, where all
 * their local data still works, because blocking an account is not a reason to
 * take away somebody's journal.
 */
export function BlockedOverlay() {
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { standing, status } = useAccountStanding();
  const signOut = useAuthStore((s) => s.signOut);

  if (status !== 'blocked') return null;

  const until = standing?.expiresAt
    ? format(new Date(standing.expiresAt), 'd MMM yyyy, HH:mm')
    : null;

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-background px-8"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="w-full items-center gap-5">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-surface">
          <ShieldAlert size={34} color={colors[scheme].destructive} strokeWidth={1.8} />
        </View>

        <View className="items-center gap-2">
          <Text variant="heading" className="text-center">
            {t('moderation.blockedTitle')}
          </Text>
          <Text variant="muted" className="text-center">
            {until ? t('moderation.blockedUntil', { date: until }) : t('moderation.blockedBody')}
          </Text>
        </View>

        {standing?.reason ? (
          <View className="w-full rounded-2xl border border-border bg-card px-4 py-3">
            <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
              {t('moderation.reason')}
            </Text>
            <Text className="mt-1 text-foreground">{standing.reason}</Text>
          </View>
        ) : null}

        <Text variant="muted" className="text-center">
          {t('moderation.localDataSafe')}
        </Text>

        <View className="w-full gap-2 pt-2">
          <Button
            variant="accent"
            size="lg"
            label={t('moderation.appeal')}
            onPress={() =>
              void Linking.openURL(
                `mailto:${APPEAL_EMAIL}?subject=${encodeURIComponent(t('moderation.appealSubject'))}`,
              )
            }
          />
          <Button
            variant="ghost"
            size="lg"
            label={t('sync.signOut')}
            onPress={() => void signOut()}
          />
        </View>
      </View>
    </View>
  );
}
