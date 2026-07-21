import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AuthField } from '@/features/auth/components/auth-field';
import { useAuthStore } from '@/features/auth/services/auth-store';

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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
      Alert.alert('Check your inbox', 'We sent you a confirmation link. Confirm your email, then sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
    // Otherwise the auth gate redirects into the app automatically.
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow justify-center gap-6 px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Text variant="heading">Create your account</Text>
          <Text variant="muted">Back up and sync your LifeOS across devices.</Text>
        </View>

        <View className="gap-4">
          <AuthField label="Name" value={name} onChangeText={setName} placeholder="What should we call you?" autoCapitalize="words" autoComplete="name" />
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
          />
          <AuthField label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secure autoComplete="new-password" />

          {error && (
            <Text variant="caption" style={{ color: '#ef4444' }}>
              {error}
            </Text>
          )}

          <Button label={busy ? 'Creating account…' : 'Create account'} variant="accent" size="lg" disabled={busy} onPress={handleSignUp} />
        </View>

        <View className="flex-row items-center justify-center gap-1">
          <Text variant="muted">Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={8}>
              <Text className="font-sora-semibold text-accent">Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
