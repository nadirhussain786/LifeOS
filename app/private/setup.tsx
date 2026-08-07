import { useRouter } from 'expo-router';
import { ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { PinPad } from '@/features/private/components/pin-pad';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { VaultButton, VaultStamp } from '@/features/private/components/well';
import {
  PRIVATE_MODULES,
  suggestedFor,
  type PrivateModuleId,
} from '@/features/private/config/private-modules';
import { isEscrowConfigured, uploadEscrow } from '@/features/private/services/vault-escrow';
import { MIN_PIN_LENGTH, setUpVault } from '@/features/private/services/vault-keys';
import { usePrivateStore } from '@/features/private/store/private-store';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { reportError } from '@/lib/error-reporting';

/**
 * First run of the private space: choose what goes in it, choose a PIN, and be
 * told plainly that a forgotten PIN means the data is gone.
 *
 * The warning is not boilerplate. This is the one place in LifeOS where losing
 * a credential destroys data with no recovery path, and burying that would be
 * the single worst thing this feature could do to somebody.
 */
/** Setup is the vault's own front door, so it is lit by the vault module's
 *  colour rather than by the app's brand accent. */
const VAULT_TINT = '#7c6cf0';

type Step = 'modules' | 'pin' | 'confirm';

export default function PrivateSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vault = useVaultTheme();
  const { t } = useTranslation();

  const gender = useProfileStore((s) => s.gender);
  const unlock = usePrivateStore((s) => s.unlock);
  const setEnabledModules = usePrivateStore((s) => s.setEnabledModules);
  const setSetUpComplete = usePrivateStore((s) => s.setSetUpComplete);

  const [step, setStep] = useState<Step>('modules');
  const [chosen, setChosen] = useState<PrivateModuleId[]>(() => suggestedFor(gender));
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: PrivateModuleId) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  /**
   * Creates the space.
   *
   * The try/finally is the whole point of this shape. Every control on this
   * screen is `disabled={busy}`, so an exception anywhere below used to leave
   * `busy` true forever: a dead screen, no message, and no way back — not even
   * the Back button. That is what "it doesn't come back" looked like, and it
   * applied to a SecureStore write failing as much as to anything exotic.
   *
   * Key derivation is deliberately slow (PBKDF2, see vault-crypto) and takes
   * seconds on a mid-range phone, so the failure mode and the success mode look
   * identical for long enough that a silent hang is indistinguishable from
   * working. Hence both the `finally` and the progress label on the button.
   */
  const finish = async () => {
    if (pin !== confirmPin) {
      setError(t('private.pinMismatch'));
      setConfirmPin('');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const key = await setUpVault(pin);
      // Seals a copy of the master key to the operator. No-ops when the build
      // has no escrow key configured, in which case the vault stays E2E.
      await uploadEscrow(key);
      setEnabledModules(chosen);
      setSetUpComplete(true);
      unlock(key, 'real');
      router.replace('/private');
    } catch (cause) {
      // Named, not swallowed. Creating the space is the one action here that
      // can fail for a reason the user cannot guess at, and "try again" with no
      // reason attached is how somebody retries the same failure ten times.
      reportError(cause, { screen: 'private/setup' });
      setError(t('private.setupFailed'));
      setConfirmPin('');
      setStep('pin');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: vault.void,
        paddingHorizontal: 24,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 16,
      }}
    >
      {step === 'modules' ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 pb-6">
            <View className="gap-3">
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tinted(VAULT_TINT, 0.16),
                }}
              >
                <ShieldCheck size={28} color={VAULT_TINT} strokeWidth={1.8} />
              </View>
              <Text
                className="font-sora-extrabold text-[27px]"
                style={{ color: vault.ink, letterSpacing: -0.6 }}
              >
                {t('private.setupTitle')}
              </Text>
              <Text className="text-sm" style={{ color: vault.mute, lineHeight: 21 }}>
                {t('private.setupBody')}
              </Text>
            </View>

            <View className="gap-2.5">
              {PRIVATE_MODULES.map((module) => {
                const selected = chosen.includes(module.id);
                const Icon = module.icon;
                return (
                  <Pressable
                    key={module.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggle(module.id)}
                    className="flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
                    style={{
                      borderWidth: 0,
                      borderTopWidth: 1,
                      borderTopColor: selected ? tinted(module.tint, 0.45) : vault.wellEdge,
                      backgroundColor: selected ? tinted(module.tint, 0.16) : vault.well,
                    }}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: tinted(module.tint, 0.2) }}
                    >
                      <Icon size={20} color={module.tint} strokeWidth={1.9} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sora-medium text-sm" style={{ color: vault.ink }}>
                        {t(module.titleKey)}
                      </Text>
                      <Text className="text-xs" style={{ color: vault.faint, lineHeight: 16 }}>
                        {t(module.subtitleKey)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Says out loud that the list is not decided by the gender answer. */}
            <Text className="px-1 text-xs" style={{ color: vault.faint, lineHeight: 17 }}>
              {t('private.suggestionNote')}
            </Text>

            {/*
              Disclosed here, before a single item is added and before a PIN is
              chosen — not buried in a policy nobody opens. Somebody deciding
              whether to put intimate photos or cycle data in this app is
              entitled to know who can reach it while the decision is still in
              front of them.

              Rendered only when the build actually has escrow configured, so a
              fork without an operator key does not display a warning that is
              false for it.
            */}
            {isEscrowConfigured() ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  backgroundColor: tinted(vault.alarm, 0.1),
                  borderTopWidth: 1,
                  borderTopColor: tinted(vault.alarm, 0.3),
                }}
              >
                <TriangleAlert size={17} color={vault.alarm} strokeWidth={2} />
                <Text className="flex-1 text-xs" style={{ color: vault.mute, lineHeight: 17 }}>
                  {t('private.operatorNotice')}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <VaultButton
            label={t('common.continue')}
            tint={VAULT_TINT}
            disabled={chosen.length === 0}
            onPress={() => setStep('pin')}
          />
        </>
      ) : null}

      {step === 'pin' || step === 'confirm' ? (
        <>
          <View className="flex-1 items-center justify-center gap-7">
            <View className="items-center gap-2">
              <VaultStamp label={t('private.stampNewSpace')} tint={tinted(VAULT_TINT, 0.85)} />
              <Text
                className="font-sora-extrabold text-[24px]"
                style={{ color: vault.ink, letterSpacing: -0.5 }}
              >
                {step === 'pin' ? t('private.choosePin') : t('private.confirmPin')}
              </Text>
              <Text
                className="text-center text-xs"
                style={{ color: vault.faint, lineHeight: 18, maxWidth: 260 }}
              >
                {error ??
                  (step === 'pin'
                    ? t('private.pinHint', { count: MIN_PIN_LENGTH })
                    : t('private.confirmPinHint'))}
              </Text>
            </View>

            <PinPad
              value={step === 'pin' ? pin : confirmPin}
              onChange={(next) => {
                setError(null);
                if (step === 'pin') setPin(next);
                else setConfirmPin(next);
              }}
              disabled={busy}
              dotCount={MIN_PIN_LENGTH}
              tint={VAULT_TINT}
            />

            {step === 'pin' ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  backgroundColor: tinted(vault.alarm, 0.1),
                  borderTopWidth: 1,
                  borderTopColor: tinted(vault.alarm, 0.3),
                }}
              >
                <TriangleAlert size={17} color={vault.alarm} strokeWidth={2} />
                <Text className="flex-1 text-xs" style={{ color: vault.mute, lineHeight: 17 }}>
                  {t('private.noRecoveryWarning')}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="gap-2">
            <VaultButton
              label={
                busy
                  ? t('private.creatingSpace')
                  : step === 'pin'
                    ? t('common.continue')
                    : t('private.createSpace')
              }
              tint={VAULT_TINT}
              disabled={
                busy ||
                (step === 'pin' ? pin.length < MIN_PIN_LENGTH : confirmPin.length < MIN_PIN_LENGTH)
              }
              onPress={() => {
                if (step === 'pin') setStep('confirm');
                else void finish();
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => {
                setError(null);
                if (step === 'confirm') {
                  setConfirmPin('');
                  setStep('pin');
                } else {
                  setPin('');
                  setStep('modules');
                }
              }}
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                className="font-sora-medium text-sm"
                style={{ color: vault.mute, opacity: busy ? 0.4 : 1 }}
              >
                {t('common.back')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}
