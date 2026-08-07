import { Stack } from 'expo-router';

import { useSecureScreen } from '@/features/private/components/secure-screen';
import { VAULT_VOID, VaultThemeProvider } from '@/features/private/components/vault-theme';

/**
 * Every private route lives under this layout, which is what guarantees the
 * screenshot block applies to all of them — including any added later, and
 * including the ones a developer forgets. Putting the call on individual
 * screens would make it something to remember, and this is not a good thing to
 * forget once.
 */
export default function PrivateLayout() {
  useSecureScreen();

  return (
    <VaultThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // No swipe-back out of the space: the gesture is easy to trigger by
          // accident and lands on whatever was underneath, which on a shared
          // screen is the wrong direction to fail.
          gestureEnabled: false,
          // The space is one dark room, so screens fade into each other rather
          // than sliding in from the side as they do everywhere else in the
          // app. A push animation reads as "another page"; this reads as
          // moving within somewhere.
          animation: 'fade',
          animationDuration: 220,
          contentStyle: { backgroundColor: VAULT_VOID },
        }}
      />
    </VaultThemeProvider>
  );
}
