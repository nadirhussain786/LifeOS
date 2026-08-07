import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { HUB_SECTIONS } from '@/features/hub/config/modules';
import { PinPad } from '@/features/private/components/pin-pad';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { VaultButton, VaultLabel, Well } from '@/features/private/components/well';
import { PrivateScreen } from '@/features/private/components/private-screen';
import { PRIVATE_MODULES } from '@/features/private/config/private-modules';
import {
  deleteAllPrivateRecords,
  deleteModuleRecords,
} from '@/features/private/services/private-repository';
import { deleteAllVaultFiles } from '@/features/private/services/vault-files';
import {
  MIN_PIN_LENGTH,
  changePin,
  destroyVaultKeys,
  hasDecoy,
  removeDecoy,
  setUpDecoy,
} from '@/features/private/services/vault-keys';
import { usePrivateStore } from '@/features/private/store/private-store';
import { reportError } from '@/lib/error-reporting';
import { confirm } from '@/lib/dialog-store';

/** Ordinary Hub modules that may be moved behind the vault. Settings is
 * excluded by `canBePrivate` — hiding it would take away the screen holding
 * the switch that puts it back. */
const MOVABLE_MODULES = HUB_SECTIONS.flatMap((section) => section.modules).filter(
  (module) => module.canBePrivate,
);

type Mode = 'menu' | 'change-current' | 'change-next' | 'decoy';

/** Settings belong to the space as a whole, so they take the vault's colour. */
const VAULT_TINT = '#7c6cf0';

export default function PrivateSettingsScreen() {
  const router = useRouter();
  const vault = useVaultTheme();
  const { t } = useTranslation();

  const space = usePrivateStore((s) => s.space);
  const enabled = usePrivateStore((s) => s.enabledModules);
  const toggleModule = usePrivateStore((s) => s.toggleModule);
  const privatised = usePrivateStore((s) => s.privatised);
  const togglePrivatised = usePrivateStore((s) => s.togglePrivatised);
  const reset = usePrivateStore((s) => s.reset);

  const [mode, setMode] = useState<Mode>('menu');
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [decoyExists, setDecoyExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hasDecoy().then(setDecoyExists);
  }, []);

  const confirmToggle = (id: (typeof PRIVATE_MODULES)[number]['id']) => {
    if (!enabled.includes(id)) {
      toggleModule(id);
      return;
    }
    // Turning a module off deletes what is in it — say so before, not after.
    void confirm({
      title: t('private.turnOffTitle'),
      message: t('private.turnOffBody'),
      confirmLabel: t('private.turnOffConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      deleteModuleRecords(id);
      toggleModule(id);
    });
  };

  const destroy = () =>
    void confirm({
      title: t('private.destroyTitle'),
      message: t('private.destroyBody'),
      confirmLabel: t('private.destroyConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      // Second confirmation: this is genuinely unrecoverable, and one
      // mis-tap should not be enough to trigger it.
      void confirm({
        title: t('private.destroyAgainTitle'),
        message: t('private.destroyAgainBody'),
        confirmLabel: t('private.destroyConfirm'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      }).then(async (ok) => {
        if (!ok) return;
        void (async () => {
          deleteAllPrivateRecords();
          deleteAllVaultFiles();
          await destroyVaultKeys();
          reset();
          router.replace('/(tabs)/hub');
        })();
      });
    });

  if (mode !== 'menu') {
    const isChange = mode === 'change-current' || mode === 'change-next';
    const value = mode === 'change-current' ? currentPin : nextPin;
    const setValue = mode === 'change-current' ? setCurrentPin : setNextPin;

    /** try/finally for the same reason as private/setup.tsx: every control here
     *  is `disabled={busy}`, so a throw inside used to leave the screen dead
     *  with no message and no way out. */
    const submit = async () => {
      setBusy(true);
      setError(null);
      try {
        if (mode === 'change-current') {
          setMode('change-next');
          return;
        }
        if (mode === 'change-next') {
          const ok = await changePin(currentPin, nextPin);
          if (!ok) {
            setError(t('private.wrongPin'));
            setCurrentPin('');
            setNextPin('');
            setMode('change-current');
            return;
          }
          setDecoyExists(false);
          setCurrentPin('');
          setNextPin('');
          setMode('menu');
          return;
        }
        // Decoy setup.
        await setUpDecoy(nextPin);
        setDecoyExists(true);
        setNextPin('');
        setMode('menu');
      } catch (cause) {
        reportError(cause, { screen: 'private/settings', mode });
        setError(t('private.setupFailed'));
      } finally {
        setBusy(false);
      }
    };

    return (
      <PrivateScreen
        title={isChange ? t('private.changePin') : t('private.setDecoy')}
        tint={VAULT_TINT}
        footer={
          <View className="gap-2">
            <VaultButton
              label={t('common.continue')}
              tint={VAULT_TINT}
              disabled={busy || value.length < MIN_PIN_LENGTH}
              onPress={() => void submit()}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              onPress={() => {
                setCurrentPin('');
                setNextPin('');
                setError(null);
                setMode('menu');
              }}
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="font-sora-medium text-sm" style={{ color: vault.mute }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        }
      >
        <View className="items-center gap-7 pt-6">
          <Text
            className="text-center text-sm"
            style={{ color: error ? vault.alarm : vault.mute, lineHeight: 20, maxWidth: 270 }}
          >
            {error ??
              (mode === 'change-current'
                ? t('private.enterCurrentPin')
                : mode === 'change-next'
                  ? t('private.enterNewPin')
                  : t('private.decoyHint'))}
          </Text>
          <PinPad
            value={value}
            onChange={setValue}
            disabled={busy}
            dotCount={MIN_PIN_LENGTH}
            tint={VAULT_TINT}
          />
        </View>
      </PrivateScreen>
    );
  }

  return (
    <PrivateScreen title={t('private.spaceSettings')} tint={VAULT_TINT}>
      <View className="gap-3">
        <VaultLabel>{t('private.whatIsInHere')}</VaultLabel>
        <Well style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
          {PRIVATE_MODULES.map((module, index) => (
            <View
              key={module.id}
              className="flex-row items-center gap-3 py-3.5"
              style={index === 0 ? undefined : { borderTopWidth: 1, borderTopColor: vault.line }}
            >
              <View className="flex-1">
                <Text className="font-sora-medium text-sm" style={{ color: vault.ink }}>
                  {t(module.titleKey)}
                </Text>
                <Text className="text-xs" style={{ color: vault.faint, lineHeight: 16 }}>
                  {t(module.subtitleKey)}
                </Text>
              </View>
              <Switch
                value={enabled.includes(module.id)}
                onValueChange={() => confirmToggle(module.id)}
                trackColor={{ true: tinted(VAULT_TINT, 0.6), false: vault.line }}
              />
            </View>
          ))}
        </Well>
      </View>

      <View className="gap-3">
        <VaultLabel>{t('private.moveModules')}</VaultLabel>
        <Well style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
          {MOVABLE_MODULES.map((module, index) => (
            <View
              key={module.id}
              className="flex-row items-center gap-3 py-3.5"
              style={index === 0 ? undefined : { borderTopWidth: 1, borderTopColor: vault.line }}
            >
              <View className="flex-1">
                <Text className="font-sora-medium text-sm" style={{ color: vault.ink }}>
                  {t(module.titleKey)}
                </Text>
                <Text className="text-xs" style={{ color: vault.faint, lineHeight: 16 }}>
                  {t(module.subtitleKey)}
                </Text>
              </View>
              <Switch
                value={privatised.includes(module.id)}
                onValueChange={() => togglePrivatised(module.id)}
                trackColor={{ true: tinted(VAULT_TINT, 0.6), false: vault.line }}
              />
            </View>
          ))}
        </Well>
        {/*
          The honest caveat, stated where the switch is rather than buried in a
          policy. Moving a module here hides it and gates it behind the PIN —
          it does not re-encrypt rows that already live in ordinary tables, and
          the word "private" invites people to assume it does.
        */}
        <Text className="px-1 text-xs" style={{ color: vault.faint, lineHeight: 17 }}>
          {t('private.moveModulesNote')}
        </Text>
      </View>

      {/*
        Only offered from the real space. Inside the decoy, a "set up a decoy"
        row would be a neon sign saying this is the decoy — which is precisely
        what somebody standing over your shoulder is looking for.
      */}
      {space === 'real' ? (
        <View className="gap-3">
          <VaultLabel>{t('private.security')}</VaultLabel>
          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode('change-current')}
              style={{
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 2,
                backgroundColor: vault.well,
                borderTopWidth: 1,
                borderTopColor: vault.wellEdge,
              }}
            >
              <Text className="font-sora-medium text-sm" style={{ color: vault.ink }}>
                {t('private.changePin')}
              </Text>
              <Text className="text-xs" style={{ color: vault.faint, lineHeight: 16 }}>
                {t('private.changePinHint')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (decoyExists) {
                  void confirm({
                    title: t('private.removeDecoyTitle'),
                    message: t('private.removeDecoyBody'),
                    confirmLabel: t('common.delete'),
                    cancelLabel: t('common.cancel'),
                    destructive: true,
                  }).then(async (ok) => {
                    if (!ok) return;
                    void removeDecoy().then(() => setDecoyExists(false));
                  });
                } else {
                  setMode('decoy');
                }
              }}
              style={{
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 2,
                backgroundColor: vault.well,
                borderTopWidth: 1,
                borderTopColor: vault.wellEdge,
              }}
            >
              <Text className="font-sora-medium text-sm" style={{ color: vault.ink }}>
                {decoyExists ? t('private.removeDecoy') : t('private.setDecoy')}
              </Text>
              <Text className="text-xs" style={{ color: vault.faint, lineHeight: 16 }}>
                {t('private.decoyExplainer')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="gap-3">
        <VaultLabel>{t('private.dangerZone')}</VaultLabel>
        <Pressable
          accessibilityRole="button"
          onPress={destroy}
          style={{
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 2,
            backgroundColor: tinted(vault.alarm, 0.1),
            borderTopWidth: 1,
            borderTopColor: tinted(vault.alarm, 0.3),
          }}
        >
          <Text className="font-sora-semibold text-sm" style={{ color: vault.alarm }}>
            {t('private.destroySpace')}
          </Text>
          <Text className="text-xs" style={{ color: vault.mute, lineHeight: 16 }}>
            {t('private.destroyHint')}
          </Text>
        </Pressable>
      </View>
    </PrivateScreen>
  );
}
