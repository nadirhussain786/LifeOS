import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { AuthField } from '@/features/auth/components/auth-field';
import { useAuthStore } from '@/features/auth/services/auth-store';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await resetPassword(email);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else setSent(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow gap-6 px-6 py-10" keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-muted">
          <ChevronLeft size={20} color={colors[scheme].foreground} />
        </Pressable>

        <View className="gap-2">
          <Text variant="heading">Reset password</Text>
          <Text variant="muted">We&apos;ll email you a link to set a new password.</Text>
        </View>

        {sent ? (
          <View className="gap-4">
            <Text>If an account exists for {email.trim()}, a reset link is on its way. Check your inbox.</Text>
            <Button label="Back to sign in" variant="accent" size="lg" onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : (
          <View className="gap-4">
            <AuthField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
              autoFocus
            />
            {error && (
              <Text variant="caption" style={{ color: '#ef4444' }}>
                {error}
              </Text>
            )}
            <Button label={busy ? 'Sending…' : 'Send reset link'} variant="accent" size="lg" disabled={busy} onPress={handleReset} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
