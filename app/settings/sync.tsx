import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, CloudOff, LogOut, TriangleAlert, UserCircle } from 'lucide-react-native';
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
  const theme = colors[scheme];

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const { status, lastSyncedAt, lastError } = useSyncStatus();
  const autoSync = useSyncStore((s) => s.autoSync);
  const setAutoSync = useSyncStore((s) => s.setAutoSync);
  const modules = useSyncStore((s) => s.modules);
  const setModuleEnabled = useSyncStore((s) => s.setModuleEnabled);

  // Guest: no account — invite sign-in, explain data stays local.
  if (!session) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Sync & Account" eyebrow="Settings" tint="#737373" />
        <ScrollView contentContainerClassName="gap-6 px-5 py-4 pb-12" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-3 rounded-2xl border border-border bg-card p-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.muted }}>
            <CloudOff size={26} color={theme.mutedForeground} />
          </View>
          <Text className="font-sora-semibold text-lg text-foreground">You&apos;re in guest mode</Text>
          <Text variant="muted" className="text-center">
            Your data lives only on this device. Create an account to back it up and sync across your devices — your current
            data comes with you.
          </Text>
          <Button label="Sign in or create account" variant="accent" size="lg" className="w-full" onPress={() => router.push('/(auth)/login')} />
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
    Alert.alert('Sign out?', 'Your synced data stays in your account. Data on this device remains available in guest mode.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const syncedLabel =
    status === 'syncing'
      ? 'Syncing…'
      : status === 'error'
        ? lastError ?? 'Sync failed'
        : lastSyncedAt
          ? `Last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}`
          : 'Not synced yet';

  const StatusIcon = status === 'error' ? TriangleAlert : CheckCircle2;
  const statusColor = status === 'error' ? theme.destructive : theme.accent;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Sync & Account" eyebrow="Settings" tint="#737373" />
      <ScrollView contentContainerClassName="gap-6 px-5 py-4 pb-12" showsVerticalScrollIndicator={false}>
      {/* Account */}
      <View className="gap-2">
        <SectionLabel>Account</SectionLabel>
        <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.muted }}>
            <UserCircle size={24} color={theme.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-sora-semibold text-foreground">{profile?.displayName || 'Your account'}</Text>
            <Text variant="caption">{profile?.email ?? session.user.email}</Text>
          </View>
        </View>
      </View>

      {/* Sync status */}
      <View className="gap-2">
        <SectionLabel>Sync</SectionLabel>
        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <View className="flex-row items-center gap-2">
            <StatusIcon size={16} color={statusColor} />
            <Text className="flex-1 font-sora-medium text-foreground">{syncedLabel}</Text>
          </View>
          <Button
            label={status === 'syncing' ? 'Syncing…' : 'Sync now'}
            variant="secondary"
            onPress={handleSyncNow}
            disabled={status === 'syncing'}
          />
          <View className="flex-row items-center justify-between border-t border-border pt-3">
            <View className="flex-1 pr-3">
              <Text className="font-sora-medium text-foreground">Auto-sync</Text>
              <Text variant="caption">Sync on launch and when the app reopens</Text>
            </View>
            <Switch value={autoSync} onValueChange={setAutoSync} trackColor={{ true: theme.accent, false: theme.border }} />
          </View>
        </View>
      </View>

      {/* What syncs */}
      <View className="gap-2">
        <SectionLabel>What syncs</SectionLabel>
        <View className="rounded-2xl border border-border bg-card px-4">
          {SYNC_MODULES.map((mod, index) => (
            <View
              key={mod.key}
              className={index === 0 ? 'flex-row items-center gap-3 py-3.5' : 'flex-row items-center gap-3 border-t border-border py-3.5'}
            >
              <View className="flex-1">
                <Text className="font-sora-medium text-foreground">{mod.label}</Text>
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
          Turn off any module to keep it on this device only. Photos, audio, and reminders always stay local for now.
        </Text>
      </View>

      {/* Sign out */}
      <Pressable onPress={handleSignOut} className="flex-row items-center justify-center gap-2 rounded-2xl border border-border py-3.5">
        <LogOut size={18} color={theme.destructive} />
        <Text className="font-sora-medium" style={{ color: theme.destructive }}>
          Sign out
        </Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}
