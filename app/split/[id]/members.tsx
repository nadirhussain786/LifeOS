import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Mail, Send, Trash2, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Share, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { useGroupDetail, useSplitMutations } from '@/features/split/hooks/use-split';
import { useColorScheme } from '@/hooks/use-color-scheme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Group members.
 *
 * Somebody added by email becomes a member immediately and can be split with
 * straight away — their user_id is filled in when they accept the invitation.
 * Until email sending exists (phase 4) they are a placeholder: real, splittable,
 * but not yet notified.
 */
export default function SplitMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const tint = moduleTint('budget', scheme);

  const { data } = useGroupDetail(id);
  const { addMember, invite, removeMember } = useSplitMutations(id);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const canAdd = EMAIL.test(email.trim()) && !addMember.isPending;
  const members = data?.members ?? [];

  const add = () => {
    if (!canAdd) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMember.mutate(
      { email: email.trim(), displayName: name.trim() || null },
      {
        onSuccess: () => {
          setEmail('');
          setName('');
        },
      },
    );
  };

  /**
   * Sends (or re-sends) the invitation. If email isn't configured yet the
   * function still returns a real, redeemable link — so hand it to the share
   * sheet rather than pretending an email went out.
   */
  const sendInvite = (memberId: string, email: string) => {
    invite.mutate(
      { memberId, email, groupName: data?.group?.name ?? '' },
      {
        onSuccess: async ({ link, emailed }) => {
          if (emailed) {
            Alert.alert(t('split.inviteSentTitle'), t('split.inviteSentBody', { email }));
            return;
          }
          await Share.share({ message: t('split.inviteShareMessage', { link }) });
        },
        onError: () => Alert.alert(t('split.inviteFailedTitle'), t('split.inviteFailedBody')),
      },
    );
  };

  const confirmRemove = (memberId: string, label: string) => {
    Alert.alert(t('split.removeMemberTitle'), t('split.removeMemberBody', { name: label }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => removeMember.mutate(memberId),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title={t('split.people')} />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-3 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-2xl border border-border bg-card px-4">
          {members.map((member, index) => {
            const label = member.displayName || member.email || t('split.someone');
            const pending = member.userId === null;
            return (
              <View
                key={member.id}
                className={
                  index === 0
                    ? 'flex-row items-center gap-3 py-3'
                    : 'flex-row items-center gap-3 border-t border-border py-3'
                }
              >
                <View className="flex-1 gap-0.5">
                  <Text className="font-sora-medium text-foreground" numberOfLines={1}>
                    {label}
                  </Text>
                  <Text variant="caption">
                    {member.role === 'owner'
                      ? t('split.owner')
                      : pending
                        ? t('split.pendingInvite')
                        : (member.email ?? '')}
                  </Text>
                </View>
                {pending && member.email && (
                  <Pressable
                    onPress={() => sendInvite(member.id, member.email!)}
                    hitSlop={8}
                    disabled={invite.isPending}
                    accessibilityLabel={t('split.sendInvite')}
                    className="h-9 w-9 items-center justify-center"
                  >
                    <Send size={16} color={tint} />
                  </Pressable>
                )}
                {member.role !== 'owner' && (
                  <Pressable
                    onPress={() => confirmRemove(member.id, label)}
                    hitSlop={8}
                    accessibilityLabel={t('common.remove')}
                  >
                    <Trash2 size={17} color={colors[scheme].mutedForeground} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <View className="gap-3">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            {t('split.addPeople')}
          </Text>

          <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <Mail size={16} color={colors[scheme].mutedForeground} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              accessibilityLabel={t('auth.email')}
              placeholder="friend@example.com"
              placeholderTextColor={colors[scheme].mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-foreground"
            />
          </View>

          <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <UserPlus size={16} color={colors[scheme].mutedForeground} />
            <TextInput
              value={name}
              onChangeText={setName}
              accessibilityLabel={t('split.theirName')}
              placeholder={t('split.theirNamePlaceholder')}
              placeholderTextColor={colors[scheme].mutedForeground}
              className="flex-1 text-foreground"
            />
          </View>

          <Text variant="caption">{t('split.inviteHint')}</Text>

          {addMember.isError && (
            <Text variant="caption" className="text-destructive">
              {t('split.memberExists')}
            </Text>
          )}

          <Button
            label={addMember.isPending ? t('common.saving') : t('split.addPerson')}
            onPress={add}
            disabled={!canAdd}
            variant="accent"
            style={{ backgroundColor: tint }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
