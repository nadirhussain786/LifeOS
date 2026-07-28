import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle2,
  CloudOff,
  LogOut,
  Trash2,
  TriangleAlert,
  UserCircle,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/features/auth/services/auth-store';
import { SYNC_MODULES } from '@/features/sync/config/sync-tables';
import { useSyncStatus } from '@/features/sync/hooks/use-sync';
import { syncNow } from '@/features/sync/services/sync-engine';
import { useSyncStore } from '@/features/sync/store/sync-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" className="px-1 font-sora-semibold uppercase tracking-wide">
      {children}
    </Text>
  );
}

export default function SyncSettingsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const theme = colors[scheme];

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const { status, lastSyncedAt, lastError } = useSyncStatus();
  const autoSync = useSyncStore((s) => s.autoSync);
  const setAutoSync = useSyncStore((s) => s.setAutoSync);
  const modules = useSyncStore((s) => s.modules);
  const setModuleEnabled = useSyncStore((s) => s.setModuleEnabled);

  // Guest: no account — invite sign-in, explain data stays local.
  if (!session) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title={t('sync.title')} eyebrow={t('sync.eyebrow')} tint="#737373" />
        <ScrollView
          contentContainerClassName="gap-6 px-5 py-4 pb-12"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center gap-3 rounded-2xl border border-border bg-card p-6">
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: theme.muted }}
            >
              <CloudOff size={26} color={theme.mutedForeground} />
            </View>
            <Text className="font-sora-semibold text-lg text-foreground">
              {t('sync.guestTitle')}
            </Text>
            <Text variant="muted" className="text-center">
              {t('sync.guestBody')}
            </Text>
            <Button
              label={t('sync.signInCreate')}
              variant="accent"
              size="lg"
              className="w-full"
              onPress={() => router.push('/(auth)/login')}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  const handleSyncNow = () => {
    Haptics.selectionAsync();
    void syncNow();
  };

  const handleSignOut = () => {
    Alert.alert(t('sync.signOutTitle'), t('sync.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('sync.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('sync.deleteAccountTitle'), t('sync.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sync.deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          const result = await deleteAccount();
          if (!result.ok) Alert.alert(t('sync.deleteFailedTitle'), result.error);
        },
      },
    ]);
  };

  const syncedLabel =
    status === 'syncing'
      ? t('sync.syncing')
      : status === 'error'
        ? (lastError ?? t('sync.syncFailed'))
        : lastSyncedAt
          ? t('sync.lastSynced', {
              time: formatDistanceToNow(lastSyncedAt, { addSuffix: true }),
            })
          : t('sync.notSyncedYet');

  const StatusIcon = status === 'error' ? TriangleAlert : CheckCircle2;
  const statusColor = status === 'error' ? theme.destructive : theme.accent;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={t('sync.title')} eyebrow={t('sync.eyebrow')} tint="#737373" />
      <ScrollView
        contentContainerClassName="gap-6 px-5 py-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <View className="gap-2">
          <SectionLabel>{t('sync.account')}</SectionLabel>
          <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.muted }}
            >
              <UserCircle size={24} color={theme.accent} />
            </View>
            <View className="flex-1">
              <Text className="font-sora-semibold text-foreground">
                {profile?.displayName || t('sync.yourAccount')}
              </Text>
              <Text variant="caption">{profile?.email ?? session.user.email}</Text>
            </View>
          </View>
        </View>

        {/* Sync status */}
        <View className="gap-2">
          <SectionLabel>{t('sync.sync')}</SectionLabel>
          <View className="gap-3 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-2">
              <StatusIcon size={16} color={statusColor} />
              <Text className="flex-1 font-sora-medium text-foreground">{syncedLabel}</Text>
            </View>
            <Button
              label={status === 'syncing' ? t('sync.syncing') : t('sync.syncNow')}
              variant="secondary"
              onPress={handleSyncNow}
              disabled={status === 'syncing'}
            />
            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <View className="flex-1 pr-3">
                <Text className="font-sora-medium text-foreground">{t('sync.autoSync')}</Text>
                <Text variant="caption">{t('sync.autoSyncDescription')}</Text>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ true: theme.accent, false: theme.border }}
              />
            </View>
          </View>
        </View>

        {/* What syncs */}
        <View className="gap-2">
          <SectionLabel>{t('sync.whatSyncs')}</SectionLabel>
          <View className="rounded-2xl border border-border bg-card px-4">
            {SYNC_MODULES.map((mod, index) => (
              <View
                key={mod.key}
                className={
                  index === 0
                    ? 'flex-row items-center gap-3 py-3.5'
                    : 'flex-row items-center gap-3 border-t border-border py-3.5'
                }
              >
                <View className="flex-1">
                  <Text className="font-sora-medium text-foreground">{t(mod.labelKey)}</Text>
                </View>
                <Switch
                  value={modules[mod.key] ?? false}
                  onValueChange={(v) => setModuleEnabled(mod.key, v)}
                  trackColor={{ true: theme.accent, false: theme.border }}
                />
              </View>
            ))}
          </View>
          <Text variant="caption" className="px-1">
            {t('sync.whatSyncsNote')}
          </Text>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-border py-3.5"
          accessibilityRole="button"
        >
          <LogOut size={18} color={theme.destructive} />
          <Text className="font-sora-medium" style={{ color: theme.destructive }}>
            {t('sync.signOut')}
          </Text>
        </Pressable>

        {/* Delete account (App/Play store requirement for account-based apps) */}
        <Pressable
          onPress={handleDeleteAccount}
          className="flex-row items-center justify-center gap-2 py-2"
          accessibilityRole="button"
        >
          <Trash2 size={16} color={theme.mutedForeground} />
          <Text
            variant="caption"
            className="font-sora-medium"
            style={{ color: theme.mutedForeground }}
          >
            {t('sync.deleteAccount')}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
