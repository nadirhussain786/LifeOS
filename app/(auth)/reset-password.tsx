import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AuthField } from '@/features/auth/components/auth-field';
import { useAuthStore } from '@/features/auth/services/auth-store';
import { supabase } from '@/lib/supabase';

/** Pulls the recovery tokens out of a Supabase reset link (they arrive in the
 * URL hash fragment, e.g. lifeos://reset-password#access_token=...&type=recovery). */
function parseRecoveryTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : url.slice(url.indexOf('?') + 1);
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = useURL();
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Establish the recovery session from the link so updateUser can set a new
  // password. If there's already a session (link handled once), we're ready too.
  useEffect(() => {
    let active = true;
    (async () => {
      const tokens = url ? parseRecoveryTokens(url) : null;
      if (tokens) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (active) {
          setReady(!sessionError);
          setChecking(false);
        }
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (active) {
        setReady(!!data.session);
        setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [url]);

  const handleUpdate = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don’t match.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    Alert.alert('Password updated', 'You’re all set.', [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow justify-center gap-6 px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Text variant="heading">Set a new password</Text>
          <Text variant="muted">Choose a new password for your account.</Text>
        </View>

        {checking ? (
          <Text variant="muted">Verifying your reset link…</Text>
        ) : !ready ? (
          <View className="gap-4">
            <Text>
              This reset link is invalid or has expired. Request a new one from the sign-in screen.
            </Text>
            <Button label="Back to sign in" variant="accent" size="lg" onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : (
          <View className="gap-4">
            <AuthField label="New password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secure autoComplete="new-password" autoFocus />
            <AuthField label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Re-enter your password" secure autoComplete="new-password" />
            {error && (
              <Text variant="caption" style={{ color: '#ef4444' }}>
                {error}
              </Text>
            )}
            <Button label={busy ? 'Updating…' : 'Update password'} variant="accent" size="lg" disabled={busy} onPress={handleUpdate} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
