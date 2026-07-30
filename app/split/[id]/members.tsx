import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Mail, Send, Trash2, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/ui/query-error';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { moduleTint } from '@/constants/design-tokens';
import { colors } from '@/constants/theme';
import { MemberAvatars } from '@/features/split/components/member-avatars';
import { formatMoney } from '@/features/budget/services/money';
import {
  useGroupBalances,
  useGroupDetail,
  useMyMembership,
  useSplitMutations,
} from '@/features/split/hooks/use-split';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { errorKind } from '@/lib/supabase-error';
import { toast } from '@/lib/toast-store';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Group members.
 *
 * Somebody added by email becomes a member immediately and can be split with
 * straight away — their user_id is filled in when they accept the invitation.
 * Until then they are a placeholder: real, splittable, but not yet notified.
 */
export default function SplitMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const tint = moduleTint('budget', scheme);

  const { data } = useGroupDetail(id);
  const { balances } = useGroupBalances(data);
  const { isOwner } = useMyMembership(data);
  const { addMember, invite, removeMember } = useSplitMutations(id);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const emailValid = EMAIL.test(email.trim());
  const canAdd = emailValid && !addMember.isPending;
  // Removed members are kept in the group's data so the ledger still balances
  // (see migration 0008); they are listed separately rather than mixed in.
  const members = data?.activeMembers ?? [];
  const removed = (data?.members ?? []).filter((m) => m.removedAt !== null);
  const currency = data?.group?.currency ?? '$';
  const netOf = (memberId: string) => balances.find((b) => b.memberId === memberId)?.netCents ?? 0;

  const add = () => {
    if (!canAdd) return;
    addMember.mutate(
      { email: email.trim(), displayName: name.trim() || null },
      {
        // Confirmation belongs after the write, not on the tap that starts it.
        onSuccess: () => {
          toast.success(t('split.memberAdded', { name: name.trim() || email.trim() }));
          setEmail('');
          setName('');
        },
        onError: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      },
    );
  };

  /**
   * Sends (or re-sends) the invitation. If email isn't configured the function
   * still returns a real, redeemable link — so hand it to the share sheet rather
   * than pretending an email went out.
   */
  const sendInvite = (memberId: string, memberEmail: string) => {
    invite.mutate(
      { memberId, email: memberEmail, groupName: data?.group?.name ?? '' },
      {
        onSuccess: async ({ link, emailed }) => {
          if (emailed) {
            // Was an Alert: a modal that stops everything to report something
            // the user just asked for and already expects.
            toast.success(t('split.inviteSentBody', { email: memberEmail }));
            return;
          }
          await Share.share({ message: t('split.inviteShareMessage', { link }) });
        },
        onError: (error) => toast.error(t(`errors.${errorKind(error)}`)),
      },
    );
  };

  /**
   * Removing somebody is visible to everyone else in the group, so this keeps
   * its confirmation rather than becoming an undoable toast.
   *
   * The removal is a tombstone: their expenses, their shares and everything
   * they are owed stay in the ledger, and they keep appearing in the balances
   * until they are settled up. Saying so matters — "remove" reads like
   * "erase", and somebody owed money would reasonably fear losing it.
   */
  const confirmRemove = (memberId: string, label: string) => {
    const net = netOf(memberId);
    const body =
      net === 0
        ? t('split.removeMemberBody', { name: label })
        : t('split.removeMemberUnsettledBody', {
            name: label,
            amount: formatMoney(Math.abs(net), currency),
          });

    Alert.alert(t('split.removeMemberTitle'), body, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () =>
          removeMember.mutate(memberId, {
            onSuccess: () => toast.success(t('split.memberRemoved', { name: label })),
            onError: (error) => toast.error(t(`errors.${errorKind(error)}`)),
          }),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title={t('split.people')} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
                  <MemberAvatars names={[label]} total={1} size={32} />
                  <View className="flex-1 gap-0.5">
                    <Text className="font-sora-medium text-foreground" numberOfLines={1}>
                      {label}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {member.role === 'owner'
                        ? t('split.owner')
                        : pending
                          ? t('split.pendingInvite')
                          : (member.email ?? '')}
                    </Text>
                  </View>
                  {pending && member.email ? (
                    <Pressable
                      onPress={() => sendInvite(member.id, member.email!)}
                      hitSlop={8}
                      disabled={invite.isPending}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: invite.isPending }}
                      accessibilityLabel={`${t('split.sendInvite')}: ${label}`}
                      className="h-11 w-11 items-center justify-center"
                    >
                      <Send size={16} color={tint} />
                    </Pressable>
                  ) : null}
                  {member.role !== 'owner' && isOwner ? (
                    <Pressable
                      onPress={() => confirmRemove(member.id, label)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('common.remove')}: ${label}`}
                      className="h-11 w-11 items-center justify-center"
                    >
                      <Trash2 size={17} color={colors[scheme].mutedForeground} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          {removed.length > 0 ? (
            <View className="gap-2">
              <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
                {t('split.formerMembers')}
              </Text>
              <View className="rounded-2xl border border-border bg-card px-4">
                {removed.map((member, index) => {
                  const label = member.displayName || member.email || t('split.someone');
                  const net = netOf(member.id);
                  return (
                    <View
                      key={member.id}
                      className={
                        index === 0
                          ? 'flex-row items-center gap-3 py-3'
                          : 'flex-row items-center gap-3 border-t border-border py-3'
                      }
                    >
                      <View style={{ opacity: 0.55 }}>
                        <MemberAvatars names={[label]} total={1} size={32} />
                      </View>
                      <View className="flex-1 gap-0.5">
                        <Text className="font-sora-medium text-foreground" numberOfLines={1}>
                          {label}
                        </Text>
                        <Text variant="caption">
                          {net === 0
                            ? t('split.removedSettled')
                            : t('split.removedOutstanding', {
                                amount: formatMoney(Math.abs(net), currency),
                              })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              {/* The reason the rows above still exist. */}
              <Text variant="caption">{t('split.formerMembersHint')}</Text>
            </View>
          ) : null}

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
                returnKeyType="next"
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
                returnKeyType="done"
                onSubmitEditing={add}
                className="flex-1 text-foreground"
              />
            </View>

            <Text variant="caption">{t('split.inviteHint')}</Text>

            {/* "That person is already in this group" was shown for every
                failure, including offline and permission ones. Now it is shown
                only for the constraint violation that actually means it. */}
            {addMember.isError ? (
              <InlineError
                error={addMember.error}
                message={
                  errorKind(addMember.error) === 'conflict' ? t('split.memberExists') : undefined
                }
              />
            ) : null}

            <Button
              label={addMember.isPending ? t('common.saving') : t('split.addPerson')}
              onPress={add}
              disabled={!canAdd}
              variant="accent"
              style={{ backgroundColor: tint }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
