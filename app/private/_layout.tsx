import { Stack } from 'expo-router';

import { useSecureScreen } from '@/features/private/components/secure-screen';

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
    <Stack
      screenOptions={{
        headerShown: false,
        // No swipe-back out of the space: the gesture is easy to trigger by
        // accident and lands on whatever was underneath, which on a shared
        // screen is the wrong direction to fail.
        gestureEnabled: false,
      }}
    />
  );
}
