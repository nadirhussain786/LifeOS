import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AuthField } from '@/features/auth/components/auth-field';
import { useAuthStore } from '@/features/auth/services/auth-store';

export default function SignUpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const signUp = useAuthStore((s) => s.signUp);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setError(t('auth.enterEmailPassword'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordMin'));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signUp(email, password, name);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // If the project requires email confirmation, there's no session yet.
    if (!useAuthStore.getState().session) {
      Alert.alert(t('auth.checkInbox'), t('auth.confirmationSent'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
    // Otherwise the auth gate redirects into the app automatically.
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center gap-6 px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text variant="heading">{t('auth.createYourAccount')}</Text>
          <Text variant="muted">{t('auth.backupSubtitle')}</Text>
        </View>

        <View className="gap-4">
          <AuthField
            label={t('auth.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('auth.namePlaceholder')}
            autoCapitalize="words"
            autoComplete="name"
          />
          <AuthField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
          />
          <AuthField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.atLeast6')}
            secure
            autoComplete="new-password"
          />

          {error && (
            <Text variant="caption" className="text-destructive">
              {error}
            </Text>
          )}

          <Button
            label={busy ? t('auth.creatingAccount') : t('auth.createAccount')}
            variant="accent"
            size="lg"
            disabled={busy}
            onPress={handleSignUp}
          />
        </View>

        <View className="flex-row items-center justify-center gap-1">
          <Text variant="muted">{t('auth.alreadyHaveAccount')}</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={8}>
              <Text className="font-sora-semibold text-accent">{t('auth.signIn')}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
