import { useRouter } from 'expo-router';
import { EyeOff, Lock, Settings2 } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { PRIVATE_MODULES } from '@/features/private/config/private-modules';
import { privateRecordCounts } from '@/features/private/services/private-repository';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { Lamp, ModuleWell, VaultStamp, Well } from '@/features/private/components/well';
import { usePrivateStore } from '@/features/private/store/private-store';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * The private space's home.
 *
 * Redirects out the moment the key disappears, which is how the auto-lock
 * actually takes effect for a screen that is already mounted — locking drops
 * the key, this notices, and the content is gone before it can be read.
 *
 * ## What the screen is trying to make somebody feel
 *
 * That they are inside something. The modules sit in wells under a single lamp
 * rather than on cards on an evenly-lit page, and the space states its own
 * condition at the top instead of leaving the user to infer it.
 *
 * The stamp says the space locks when you leave the app, which is the true
 * behaviour (a 20-second grace on backgrounding — see AUTO_LOCK_GRACE_MS) and
 * not a countdown. An earlier sketch of this screen showed "4 min left"; there
 * is no session timer to show, and inventing a number that looks like a
 * security guarantee is worse than saying nothing.
 */
export default function PrivateHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vault = useVaultTheme();
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const key = usePrivateStore((s) => s.key);
  const space = usePrivateStore((s) => s.space);
  const enabled = usePrivateStore((s) => s.enabledModules);
  const lock = usePrivateStore((s) => s.lock);

  useEffect(() => {
    if (!key) router.replace('/private/unlock');
  }, [key, router]);

  const counts = useMemo(() => (key ? privateRecordCounts() : {}), [key]);

  if (!key) return null;

  const modules = PRIVATE_MODULES.filter((m) => enabled.includes(m.id));
  // The lamp takes the colour of the first module in the space, so the room is
  // lit by what is in it rather than by a brand colour.
  const lampTint = modules[0]?.tint ?? '#7c6cf0';

  return (
    <View style={{ flex: 1, backgroundColor: vault.void }}>
      <Lamp tint={lampTint} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <VaultStamp label={t('private.stampUnlocked')} tint={tinted(lampTint, 0.85)} />
            <Text
              className="font-sora-extrabold text-[26px]"
              style={{ color: vault.ink, letterSpacing: -0.6 }}
            >
              {t('private.spaceTitle')}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('private.lockNow')}
            onPress={() => {
              lock();
              router.replace('/(tabs)/hub');
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? tinted(lampTint, 0.18) : vault.well,
              borderTopWidth: 1,
              borderTopColor: vault.wellEdge,
            })}
          >
            <Lock size={18} color={vault.mute} strokeWidth={1.9} />
          </Pressable>
        </View>

        {/*
          The decoy space says so, and only from inside. Somebody who compelled
          the decoy PIN sees an ordinary, slightly empty private space; the
          owner needs to know which one they are looking at before they start
          adding real things to the wrong one.
        */}
        {space === 'decoy' ? (
          <Well style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <EyeOff size={17} color={vault.mute} strokeWidth={1.9} />
            <Text className="flex-1 text-xs" style={{ color: vault.mute, lineHeight: 17 }}>
              {t('private.decoyNotice')}
            </Text>
          </Well>
        ) : null}

        <View style={{ gap: 10 }}>
          {modules.map((module, index) => {
            const count = counts[module.id] ?? 0;
            return (
              <Animated.View
                key={module.id}
                // Staggered so the room assembles rather than appearing whole —
                // the only motion on the screen, and it plays once on entry.
                entering={reducedMotion ? undefined : FadeInDown.delay(index * 55).duration(320)}
              >
                <ModuleWell
                  icon={module.icon}
                  tint={module.tint}
                  name={t(module.titleKey)}
                  meta={count > 0 ? t('private.itemCount', { count }) : t(module.subtitleKey)}
                  onPress={() => router.push(module.route as never)}
                />
              </Animated.View>
            );
          })}
        </View>

        <Well
          onPress={() => router.push('/private/settings')}
          accessibilityLabel={t('private.spaceSettings')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Settings2 size={17} color={vault.mute} strokeWidth={1.9} />
          <Text className="flex-1 font-sora-medium text-sm" style={{ color: vault.mute }}>
            {t('private.spaceSettings')}
          </Text>
        </Well>

        {/* The claim, made once, at the bottom, where it reads as a fact about
            the room rather than as reassurance being sold. */}
        <Text
          className="text-center text-[11px]"
          style={{ color: vault.faint, lineHeight: 16, paddingHorizontal: 16 }}
        >
          {t('private.groundClaim')}
        </Text>
      </ScrollView>
    </View>
  );
}
