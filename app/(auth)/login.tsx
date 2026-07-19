import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AuthField } from '@/features/auth/components/auth-field';
import { useAuthStore } from '@/features/auth/services/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    // On success the auth gate redirects automatically.
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow justify-center gap-6 px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Text variant="heading">Welcome back</Text>
          <Text variant="muted">Sign in to sync your LifeOS across devices.</Text>
        </View>

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
          <AuthField label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secure autoComplete="password" />

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable hitSlop={8} className="self-end">
              <Text variant="caption" className="font-sora-medium">
                Forgot password?
              </Text>
            </Pressable>
          </Link>

          {error && (
            <Text variant="caption" style={{ color: '#ef4444' }}>
              {error}
            </Text>
          )}

          <Button label={busy ? 'Signing in…' : 'Sign in'} variant="accent" size="lg" disabled={busy} onPress={handleSignIn} />
        </View>

        <View className="flex-row items-center justify-center gap-1">
          <Text variant="muted">New here?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable hitSlop={8}>
              <Text className="font-sora-semibold text-accent">Create an account</Text>
            </Pressable>
          </Link>
        </View>

        <Pressable
          onPress={() => {
            continueAsGuest();
            router.replace('/(tabs)');
          }}
          className="items-center py-2"
        >
          <Text variant="muted" className="underline">
            Continue without an account
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
