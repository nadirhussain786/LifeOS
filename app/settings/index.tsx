import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  Database,
  Download,
  Droplet,
  Info,
  Laptop,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { SettingsRow } from '@/components/ui/settings-row';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { exportAllData } from '@/lib/data-export';
import { clearAllData } from '@/lib/data-management';
import { queryClient } from '@/lib/query-client';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { authenticate, getBiometricLabel, isBiometricAvailable } from '@/features/security/lib/biometrics';
import { useAppearanceStore, type ThemePreference } from '@/features/settings/store/appearance-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Laptop },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" className="px-1 font-sora-semibold uppercase tracking-wide">
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const themePreference = useAppearanceStore((state) => state.themePreference);
  const setThemePreference = useAppearanceStore((state) => state.setThemePreference);

  const appLockEnabled = useProfileStore((state) => state.appLockEnabled);
  const setAppLockEnabled = useProfileStore((state) => state.setAppLockEnabled);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    getBiometricLabel().then(setBioLabel);
  }, []);

  const toggleAppLock = async (next: boolean) => {
    if (next) {
      if (!bioAvailable) {
        Alert.alert('Set up biometrics first', 'Add Face ID or a fingerprint in your device settings, then turn on App lock here.');
        return;
      }
      // Confirm the person can actually authenticate before arming the lock.
      const ok = await authenticate(`Confirm ${bioLabel}`);
      if (!ok) return;
    }
    Haptics.selectionAsync();
    setAppLockEnabled(next);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportAllData();
    } catch {
      Alert.alert('Export failed', "Couldn't prepare your data export. Try again in a moment.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Delete everything?',
      'This permanently deletes every task, note, habit, journal entry, water log, and calendar event on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            queryClient.clear();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Data cleared', 'LifeOS is back to a clean slate.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 px-5 py-4 pb-10">
      <View className="gap-2">
        <SectionLabel>Appearance</SectionLabel>
        <View className="flex-row gap-2 rounded-2xl border border-border bg-card p-2">
          {THEME_OPTIONS.map((option) => {
            const selected = themePreference === option.value;
            const Icon = option.icon;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setThemePreference(option.value);
                }}
                className="flex-1 items-center gap-1.5 rounded-xl py-2.5"
                style={{ backgroundColor: selected ? colors[scheme].accent : 'transparent' }}
              >
                <Icon size={17} color={selected ? colors[scheme].accentForeground : colors[scheme].mutedForeground} />
                <Text
                  variant="caption"
                  className="font-sora-medium"
                  style={{ color: selected ? colors[scheme].accentForeground : colors[scheme].mutedForeground }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <SectionLabel>Notifications</SectionLabel>
        <View className="rounded-2xl border border-border bg-card px-4">
          <SettingsRow
            icon={Bell}
            label="Notifications"
            subtitle="Delivery, quiet hours & what you hear about"
            isFirst
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingsRow
            icon={Droplet}
            label="Water intake reminders"
            subtitle="Daily hydration nudges on your schedule"
            onPress={() => router.push('/water-intake/settings')}
          />
          <SettingsRow
            icon={BookOpen}
            label="Journal reminder"
            subtitle="A daily nudge to write today's entry"
            onPress={() => router.push('/journal/reminder-settings')}
          />
        </View>
        <Text variant="caption" className="px-1">
          Tasks, notes, habits, and calendar events each have their own reminder — set it right from the item.
        </Text>
      </View>

      <View className="gap-2">
        <SectionLabel>Privacy</SectionLabel>
        <View className="rounded-2xl border border-border bg-card px-4">
          <SettingsRow
            icon={LockKeyhole}
            label="App lock"
            subtitle={bioAvailable ? `Require ${bioLabel} to open LifeOS` : 'Add Face ID or a fingerprint to enable'}
            isFirst
            right={
              <Switch
                value={appLockEnabled}
                onValueChange={toggleAppLock}
                disabled={!bioAvailable && !appLockEnabled}
                trackColor={{ true: colors[scheme].accent, false: colors[scheme].border }}
                thumbColor="#ffffff"
              />
            }
          />
        </View>
      </View>

      <View className="gap-2">
        <SectionLabel>Data</SectionLabel>
        <View className="rounded-2xl border border-border bg-card px-4">
          <SettingsRow
            icon={Download}
            label={isExporting ? 'Preparing export…' : 'Export data'}
            subtitle="Save a JSON backup of everything"
            isFirst
            disabled={isExporting}
            onPress={handleExport}
            chevron={false}
          />
          <SettingsRow
            icon={Trash2}
            label="Clear all data"
            subtitle="Permanently delete everything on this device"
            destructive
            onPress={handleClearData}
            chevron={false}
          />
        </View>
      </View>

      <View className="gap-2">
        <SectionLabel>About</SectionLabel>
        <View className="rounded-2xl border border-border bg-card px-4">
          <SettingsRow icon={Info} label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} isFirst />
          <SettingsRow icon={Database} label="Storage" value="On this device" />
          <SettingsRow icon={ShieldCheck} label="Sync & account" subtitle="Backup, sync, and sign in" onPress={() => router.push('/settings/sync')} />
        </View>
      </View>
    </ScrollView>
  );
}
