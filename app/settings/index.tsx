import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  Database,
  Download,
  Droplet,
  FileText,
  Info,
  Languages,
  LifeBuoy,
  Scale,
  Upload,
  UserCircle,
  Laptop,
  EyeOff,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  UserX,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/screen-header';
import { SettingsRow } from '@/components/ui/settings-row';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { exportAllData } from '@/lib/data-export';
import { importDataFromFile } from '@/lib/data-import';
import { clearAllData } from '@/lib/data-management';
import { queryClient } from '@/lib/query-client';
import { confirm, notify } from '@/lib/dialog-store';
import { toast } from '@/lib/toast-store';
import { isVaultSetUp } from '@/features/private/services/vault-keys';
import { useProfileStore } from '@/features/profile/store/profile-store';
import {
  authenticate,
  getBiometricLabel,
  isBiometricAvailable,
} from '@/features/security/lib/biometrics';
import { LanguageSheet } from '@/features/settings/components/language-sheet';
import { reloadForDirectionChange } from '@/features/settings/lib/layout-direction';
import {
  useAppearanceStore,
  type ThemePreference,
} from '@/features/settings/store/appearance-store';
import { useLanguageStore, type Language } from '@/features/settings/store/language-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { env } from '@/lib/env';

const THEME_OPTIONS: { value: ThemePreference; labelKey: string; icon: typeof Sun }[] = [
  { value: 'system', labelKey: 'settings.system', icon: Laptop },
  { value: 'light', labelKey: 'settings.light', icon: Sun },
  { value: 'dark', labelKey: 'settings.dark', icon: Moon },
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
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const themePreference = useAppearanceStore((state) => state.themePreference);
  const setThemePreference = useAppearanceStore((state) => state.setThemePreference);

  const appLockEnabled = useProfileStore((state) => state.appLockEnabled);
  const setAppLockEnabled = useProfileStore((state) => state.setAppLockEnabled);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');
  // Decides whether the private-space row leads to setup or the PIN pad. Says
  // nothing about what is inside, only whether a space exists.
  const [privateSetUp, setPrivateSetUp] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    getBiometricLabel().then(setBioLabel);
    void isVaultSetUp().then(setPrivateSetUp);
  }, []);

  const toggleAppLock = async (next: boolean) => {
    if (next) {
      if (!bioAvailable) {
        void notify({
          title: t('settings.setUpBiometricsTitle'),
          message: t('settings.setUpBiometricsBody'),
          confirmLabel: t('common.ok'),
        });
        return;
      }
      // Confirm the person can actually authenticate before arming the lock.
      const ok = await authenticate(t('settings.confirmBiometric', { method: bioLabel }));
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
      toast.error(t('settings.exportFailedBody'));
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Restores an exported backup. Merges rather than replaces, so importing an
   * older file can never destroy newer work — see lib/data-import.ts.
   */
  const handleImport = () => {
    void confirm({
      title: t('settings.importTitle'),
      message: t('settings.importBody'),
      confirmLabel: t('settings.chooseFile'),
      cancelLabel: t('common.cancel'),
    }).then(async (ok) => {
      if (!ok) return;
      setIsImporting(true);
      try {
        const result = await importDataFromFile();
        if (!result.ok) {
          if (result.reason === 'cancelled') return;
          // Reasons are kebab-case; the i18n keys can't be.
          toast.error(t('settings.import_' + result.reason.replace(/-/g, '')));
          return;
        }
        queryClient.clear();
        toast.success(t('settings.importDone', { rows: result.rows }));
        // Media files were never in the JSON, so say so plainly rather than
        // letting it surface later as broken thumbnails.
        if (result.missingMedia > 0) {
          setTimeout(
            () => toast.info(t('settings.importMissingMedia', { count: result.missingMedia })),
            3400,
          );
        }
      } finally {
        setIsImporting(false);
      }
    });
  };

  const handleClearData = () => {
    void confirm({
      title: t('settings.clearTitle'),
      message: t('settings.clearBody'),
      confirmLabel: t('settings.deleteEverything'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      clearAllData();
      queryClient.clear();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.success(t('settings.clearedBody'));
    });
  };

  /**
   * Switching between an LTR and an RTL language flips the whole layout, which
   * React Native only re-lays-out on a fresh start — so restart ourselves once
   * the choice is safely on disk. Same-direction switches (English ↔ Hindi)
   * need no restart and stay instant.
   */
  const chooseLanguage = async (language: Language) => {
    setLanguageSheetOpen(false);
    const directionChanged = await setLanguage(language);
    if (!directionChanged) return;
    if (await reloadForDirectionChange()) return;
    void notify({
      title: t('settings.restartTitle'),
      message: t('settings.restartBody'),
      confirmLabel: t('common.ok'),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={t('settings.title')} eyebrow={t('settings.eyebrow')} tint="#737373" />
      <ScrollView
        contentContainerClassName="gap-6 px-5 py-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <SectionLabel>{t('settings.appearance')}</SectionLabel>
          <View className="flex-row gap-2 rounded-2xl border border-border bg-card p-2">
            {THEME_OPTIONS.map((option) => {
              const selected = themePreference === option.value;
              const Icon = option.icon;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setThemePreference(option.value);
                  }}
                  className="flex-1 items-center gap-1.5 rounded-xl py-2.5"
                  style={{ backgroundColor: selected ? colors[scheme].accent : 'transparent' }}
                >
                  <Icon
                    size={17}
                    color={
                      selected ? colors[scheme].accentForeground : colors[scheme].mutedForeground
                    }
                  />
                  <Text
                    variant="caption"
                    className="font-sora-medium"
                    style={{
                      color: selected
                        ? colors[scheme].accentForeground
                        : colors[scheme].mutedForeground,
                    }}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="rounded-2xl border border-border bg-card px-4">
            <SettingsRow
              icon={Languages}
              label={t('settings.language')}
              value={t(`language.${language}`)}
              isFirst
              onPress={() => setLanguageSheetOpen(true)}
            />
          </View>
        </View>

        <View className="gap-2">
          <SectionLabel>{t('settings.notifications')}</SectionLabel>
          <View className="rounded-2xl border border-border bg-card px-4">
            <SettingsRow
              icon={Bell}
              label={t('settings.notifications')}
              subtitle={t('settings.notificationsSubtitle')}
              isFirst
              onPress={() => router.push('/settings/notifications')}
            />
            <SettingsRow
              icon={Droplet}
              label={t('settings.waterReminders')}
              subtitle={t('settings.waterRemindersSubtitle')}
              onPress={() => router.push('/water-intake/settings')}
            />
            <SettingsRow
              icon={BookOpen}
              label={t('settings.journalReminder')}
              subtitle={t('settings.journalReminderSubtitle')}
              onPress={() => router.push('/journal/reminder-settings')}
            />
          </View>
          <Text variant="caption" className="px-1">
            {t('settings.perItemReminderNote')}
          </Text>
        </View>

        <View className="gap-2">
          <SectionLabel>{t('settings.privacy')}</SectionLabel>
          <View className="rounded-2xl border border-border bg-card px-4">
            <SettingsRow
              icon={LockKeyhole}
              label={t('settings.appLock')}
              subtitle={
                bioAvailable
                  ? t('settings.appLockRequire', { method: bioLabel })
                  : t('settings.appLockUnavailable')
              }
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
            {/*
              The one visible entry point to the private space. Its *existence*
              is not the secret — its contents are, and those need a separate
              PIN. Hiding this row too would leave no way back in, which is a
              worse failure than an onlooker knowing the feature exists at all.
            */}
            <SettingsRow
              icon={UserCircle}
              label={t('profile.title')}
              subtitle={t('profile.settingsSubtitle')}
              onPress={() => router.push('/profile')}
            />
            <SettingsRow
              icon={EyeOff}
              label={t('private.entryLabel')}
              subtitle={
                privateSetUp ? t('private.entrySubtitleSetUp') : t('private.entrySubtitleNew')
              }
              onPress={() => router.push(privateSetUp ? '/private/unlock' : '/private/setup')}
            />
          </View>
        </View>

        <View className="gap-2">
          <SectionLabel>{t('settings.data')}</SectionLabel>
          <View className="rounded-2xl border border-border bg-card px-4">
            <SettingsRow
              icon={Download}
              label={isExporting ? t('settings.preparingExport') : t('settings.exportData')}
              subtitle={t('settings.exportSubtitle')}
              isFirst
              disabled={isExporting}
              onPress={handleExport}
              chevron={false}
            />
            <SettingsRow
              icon={Upload}
              label={isImporting ? t('settings.importing') : t('settings.importData')}
              subtitle={t('settings.importSubtitle')}
              disabled={isImporting}
              onPress={handleImport}
              chevron={false}
            />
            <SettingsRow
              icon={Trash2}
              label={t('settings.clearData')}
              subtitle={t('settings.clearDataSubtitle')}
              destructive
              onPress={handleClearData}
              chevron={false}
            />
          </View>
        </View>

        <View className="gap-2">
          <SectionLabel>{t('settings.about')}</SectionLabel>
          <View className="rounded-2xl border border-border bg-card px-4">
            <SettingsRow
              icon={Info}
              label={t('settings.version')}
              value={Constants.expoConfig?.version ?? '1.0.0'}
              isFirst
            />
            <SettingsRow
              icon={Database}
              label={t('settings.storage')}
              value={t('settings.onThisDevice')}
            />
            <SettingsRow
              icon={ShieldCheck}
              label={t('settings.syncAccount')}
              subtitle={t('settings.syncAccountSubtitle')}
              onPress={() => router.push('/settings/sync')}
            />
            {/* Reachable without an account: guest mode has no blocks to show,
                but somebody who signed out still needs the way back to undo
                one, and hiding the row makes the feature look absent. */}
            <SettingsRow
              icon={UserX}
              label={t('moderation.blockedAccounts')}
              subtitle={t('moderation.blockedAccountsSubtitle')}
              onPress={() => router.push('/settings/blocked')}
            />
            <SettingsRow
              icon={FileText}
              label={t('settings.privacyPolicy')}
              onPress={() => Linking.openURL(env.EXPO_PUBLIC_PRIVACY_URL)}
            />
            <SettingsRow
              icon={Scale}
              label={t('settings.terms')}
              onPress={() => Linking.openURL(env.EXPO_PUBLIC_TERMS_URL)}
            />
            {/* Both stores require a working contact address. Until now the
                app's only one was the mailto on the block screen — reachable
                exactly when the user could no longer use the app. */}
            <SettingsRow
              icon={LifeBuoy}
              label={t('settings.support')}
              subtitle={t('settings.supportSubtitle')}
              onPress={() =>
                Linking.openURL(
                  `mailto:${env.EXPO_PUBLIC_SUPPORT_EMAIL}?subject=${encodeURIComponent('LifeOS support')}`,
                )
              }
            />
          </View>
        </View>
      </ScrollView>

      <LanguageSheet
        visible={languageSheetOpen}
        current={language}
        onClose={() => setLanguageSheetOpen(false)}
        onSelect={(next) => void chooseLanguage(next)}
      />
    </View>
  );
}
